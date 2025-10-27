package service

import (
	"fmt"
	"log"
	"math"
	"sort"
	"sync"
	"time"

	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"

	"github.com/nleea/fleet-monitoring/backend/internal/ws"
)

type SensorService struct {
	sensorRepo repository.SensorRepository
	alertRepo  repository.AlertRepository

	lastAlert   map[uint]time.Time
	activeAlert map[uint]bool
	mu          sync.Mutex

	hub *ws.Hub

	deviceNames map[uint]string
	deviceRepo  repository.DeviceRepository
}

func NewSensorService(sensorRepo repository.SensorRepository, alertRepo repository.AlertRepository, hub *ws.Hub, deviceRepo repository.DeviceRepository) *SensorService {
	return &SensorService{
		sensorRepo:  sensorRepo,
		alertRepo:   alertRepo,
		lastAlert:   make(map[uint]time.Time),
		activeAlert: make(map[uint]bool),
		hub:         hub,
		deviceRepo: deviceRepo,
	}
}

func (s *SensorService) IngestData(deviceID uint, lat, lng, speed, fuel, temp float64, ts ...time.Time) error {
	data := &domain.SensorData{
		Channel:     "Telemetry",
		DeviceID:    deviceID,
		TS:          ts[0],
		Lat:         lat,
		Lng:         lng,
		Speed:       speed,
		FuelLevel:   fuel,
		Temperature: temp,
	}
	if err := s.sensorRepo.Create(data); err != nil {
		return err
	}

	go s.hub.Broadcast(
		"telemetry",
		map[string]any{
			"device_id":   deviceID,
			"lat":         lat,
			"lng":         lng,
			"speed":       speed,
			"fuel":        fuel,
			"temperature": temp,
			"ts":   ts[0].Format(time.RFC3339),
		},
		map[string]any{
			"timestamp": time.Now().Format(time.RFC3339),
			"source":    "SensorService",
		},
		"admin", "user",
	)

	return s.checkFuelAlert(deviceID)
}

func (s *SensorService) GetSensorDataByDeviceID(deviceID uint) (*[]domain.SensorData, error) {
	recent, err := s.sensorRepo.GetRecentByDevice(deviceID, 10)

	if err != nil || len(recent) < 2 {
		return nil, nil
	}

	return &recent, nil
}

func (s *SensorService) PredictiveFuelCheck(deviceID uint) (bool, float64, error) {
	// Análisis de tendencia
	recent, err := s.sensorRepo.GetRecentByDevice(deviceID, 100)
	if err != nil {
		return false, 0, err
	}

	if len(recent) < 3 {
		return false, 0, nil
	}

	const (
		tankCapacity        = 200.0
		alertThresholdHours = 1.0
		maxHoursGap         = 24.0
	)

	// Filtrar duplicados
	filtered := []domain.SensorData{recent[0]}
	for i := 1; i < len(recent); i++ {
		if !recent[i].TS.Equal(filtered[len(filtered)-1].TS) {
			filtered = append(filtered, recent[i])
		}
	}

	if len(filtered) < 3 {
		return false, 0, nil
	}

	// 1. Calcular consumo en cada intervalo
	type Intervalo struct {
		consumoPercent float64
		tiempoMinutos  float64
		tasaLitrosMin  float64
	}

	var intervalos []Intervalo

	for i := 0; i < len(filtered)-1; i++ {
		fuelAntiguo := filtered[i+1].FuelLevel
		fuelReciente := filtered[i].FuelLevel
		consumoPercent := fuelAntiguo - fuelReciente
		tiempoMinutos := filtered[i].TS.Sub(filtered[i+1].TS).Minutes()
		tiempoHoras := tiempoMinutos / 60.0

		// Solo considerar intervalos válidos
		if consumoPercent > 0 && tiempoMinutos > 0 && tiempoHoras < maxHoursGap {
			tasaLitrosMin := (consumoPercent / 100.0) * tankCapacity / tiempoMinutos

			// Filtrar valores extremadamente anómalos
			if tasaLitrosMin > 0.001 && tasaLitrosMin < 10.0 {
				intervalos = append(intervalos, Intervalo{
					consumoPercent: consumoPercent,
					tiempoMinutos:  tiempoMinutos,
					tasaLitrosMin:  tasaLitrosMin,
				})
			}
		}
	}

	if len(intervalos) == 0 {
		log.Printf("[WARN] Dev:%d - Sin intervalos válidos para análisis", deviceID)
		return false, 0, nil
	}

	// 2. Calcular estadísticas del consumo
	var sumaConsumo, sumaTiempo, sumaTasas float64
	tasasOrdenadas := make([]float64, len(intervalos))

	for i, intervalo := range intervalos {
		sumaConsumo += intervalo.consumoPercent
		sumaTiempo += intervalo.tiempoMinutos
		sumaTasas += intervalo.tasaLitrosMin
		tasasOrdenadas[i] = intervalo.tasaLitrosMin
	}

	// Calcular tasa promedio global
	tasaPromedioGlobal := (sumaConsumo / 100.0 * tankCapacity) / sumaTiempo

	// Calcular mediana
	sort.Float64s(tasasOrdenadas)
	var tasaMediana float64
	mitad := len(tasasOrdenadas) / 2
	if len(tasasOrdenadas)%2 == 0 {
		tasaMediana = (tasasOrdenadas[mitad-1] + tasasOrdenadas[mitad]) / 2.0
	} else {
		tasaMediana = tasasOrdenadas[mitad]
	}

	// 3. Dar más peso a lecturas recientes
	var consumoReciente, tiempoReciente float64
	lecturasPrioritarias := 10
	if len(intervalos) < lecturasPrioritarias {
		lecturasPrioritarias = len(intervalos)
	}

	for i := 0; i < lecturasPrioritarias; i++ {
		consumoReciente += intervalos[i].consumoPercent
		tiempoReciente += intervalos[i].tiempoMinutos
	}

	tasaReciente := (consumoReciente / 100.0 * tankCapacity) / tiempoReciente

	// 4. Decidir qué tasa usar
	tasaFinal := math.Max(tasaReciente, tasaMediana)

	// Si la tasa reciente es significativamente mayor, usar esa
	if tasaReciente > tasaPromedioGlobal*1.5 {
		tasaFinal = tasaReciente
		log.Printf("[WARN] Dev:%d - Consumo reciente elevado detectado: %.4f L/min (promedio histórico: %.4f L/min)",
			deviceID, tasaReciente, tasaPromedioGlobal)
	}

	// 5. Calcular autonomía con la tasa final
	fuelActualLitros := (filtered[0].FuelLevel / 100.0) * tankCapacity

	if fuelActualLitros <= 1.0 {
		log.Printf("[CRITICAL] Dev:%d - Tanque casi vacío: %.2fL", deviceID, fuelActualLitros)
		return true, 0, nil
	}

	autonomiaMinutos := fuelActualLitros / tasaFinal
	autonomiaHoras := autonomiaMinutos / 60.0
	debeAlertar := autonomiaHoras < alertThresholdHours

	// 6. Logging detallado
	log.Printf("[FUEL] Dev:%d | Nivel:%.2f%% (%.1fL) | Intervalos:%d",
		deviceID, filtered[0].FuelLevel, fuelActualLitros, len(intervalos))
	log.Printf("       Tasa Promedio:%.4fL/min | Mediana:%.4fL/min | Reciente:%.4fL/min | USANDO:%.4fL/min",
		tasaPromedioGlobal, tasaMediana, tasaReciente, tasaFinal)
	log.Printf("       Autonomía: %.0f min (%.1fh) | Umbral: %.1fh | ALERTA:%v",
		autonomiaMinutos, autonomiaHoras, alertThresholdHours, debeAlertar)

	// mostrar últimos 5 intervalos
	if len(intervalos) > 0 {
		log.Printf("       Últimos intervalos:")
		limite := 5
		if len(intervalos) < limite {
			limite = len(intervalos)
		}
		for i := 0; i < limite; i++ {
			log.Printf("         [%d] %.2f%% en %.1f min → %.4f L/min",
				i, intervalos[i].consumoPercent, intervalos[i].tiempoMinutos, intervalos[i].tasaLitrosMin)
		}
	}

	return debeAlertar, autonomiaMinutos, nil
}

func (s *SensorService) broadcastAlert(alert *domain.Alert) {
	if s.hub == nil {
		return
	}

	payload := map[string]any{
		"channel":   "Alert",
		"type":      alert.Type,
		"device_id": alert.DeviceID,
		"timestamp": alert.TS.Format(time.RFC3339),
		"payload":   string(alert.Payload),
		"message":   "🚨 Combustible crítico detectado",
		"id":        alert.ID,
	}

	go s.hub.Broadcast(
		"alert",
		payload,
		map[string]any{
			"timestamp": alert.TS.Format(time.RFC3339),
			"source":    "AlertService",
			"severity":  "critical",
		},
		"admin",
	)
}

func (s *SensorService) checkFuelAlert(deviceID uint) error {
	s.mu.Lock()
	lastAlertTime, hasLastAlert := s.lastAlert[deviceID]
	isActive := s.activeAlert[deviceID]
	s.mu.Unlock()

	if hasLastAlert && time.Since(lastAlertTime) < 5*time.Second {
		return nil
	}

	// Analisis Predictivo de la gasolina
	debeAlertar, autonomiaMinutos, err := s.PredictiveFuelCheck(deviceID)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastAlert[deviceID] = time.Now()

	if debeAlertar && !isActive {
		s.activeAlert[deviceID] = true

		deviceName := s.getDeviceName(deviceID)

		alert := &domain.Alert{
			DeviceID: deviceID,
			Type:     domain.AlertFuelLow,
			TS:       time.Now().UTC(),
			Payload: []byte(fmt.Sprintf(
				`{"device_name":"%s","autonomy_minutes":%.2f,"autonomy_hours":%.2f}`,
				deviceName,
				autonomiaMinutos,
				autonomiaMinutos/60,
			)),
		}

		if err := s.alertRepo.Create(alert); err != nil {
			log.Printf("[ERROR] No se pudo crear alerta de combustible bajo: %v", err)
			return err
		}

		s.broadcastAlert(alert)

		log.Printf("[ALERT] 🚨 ALERTA ACTIVADA - Dispositivo %d: Combustible crítico, autonomía %.0f min (%.1f horas)",
			deviceID, autonomiaMinutos, autonomiaMinutos/60)
	}

	if !debeAlertar && isActive {
		s.activeAlert[deviceID] = false
		log.Printf("[INFO] ✅ ALERTA RESUELTA - Dispositivo %d: Combustible normalizado, autonomía %.0f min (%.1f horas)",
			deviceID, autonomiaMinutos, autonomiaMinutos/60)
	}

	return nil
}

func (s *SensorService) getDeviceName(deviceID uint) string {
	if s.deviceNames == nil {
		s.deviceNames = make(map[uint]string)
	}

	if name, ok := s.deviceNames[deviceID]; ok {
		return name
	}
	device, err := s.deviceRepo.GetByDeviceIdID(deviceID)

	if err != nil {
		log.Printf("[WARN] No se pudo obtener nombre de device %d: %v", deviceID, err)
		s.deviceNames[deviceID] = fmt.Sprintf("Device-%d", deviceID)
		return s.deviceNames[deviceID]
	}

	s.deviceNames[deviceID] = device.ExternalID
	return device.ExternalID
}
