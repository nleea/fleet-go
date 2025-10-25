package service

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/nleea/fleet-monitoring/internal/domain"
	"github.com/nleea/fleet-monitoring/internal/repository"

	"github.com/nleea/fleet-monitoring/internal/ws"
)

type SensorService struct {
	sensorRepo repository.SensorRepository
	alertRepo  repository.AlertRepository

	lastAlert   map[uint]time.Time
	activeAlert map[uint]bool
	mu          sync.Mutex

	hub *ws.Hub
}

func NewSensorService(sensorRepo repository.SensorRepository, alertRepo repository.AlertRepository, hub *ws.Hub) *SensorService {
	return &SensorService{
		sensorRepo:  sensorRepo,
		alertRepo:   alertRepo,
		lastAlert:   make(map[uint]time.Time),
		activeAlert: make(map[uint]bool),
		hub:         hub,
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
			"device_id": deviceID,
			"lat":       lat,
			"lng":       lng,
			"speed":     speed,
			"fuel":      fuel,
			"temperature": temp,
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
	recent, err := s.sensorRepo.GetRecentByDevice(deviceID, 10)
	if err != nil {
		return false, 0, err
	}

	if len(recent) < 2 {
		return false, 0, nil
	}

	const (
		tankCapacity        = 200.0
		alertThresholdHours = 1.0
	)

	filtered := []domain.SensorData{recent[0]}
	// filtramos los iguales por timestamp
	for i := 1; i < len(recent); i++ {
		if !recent[i].TS.Equal(filtered[len(filtered)-1].TS) {
			filtered = append(filtered, recent[i])
		}
	}

	if len(filtered) < 2 {
		return false, 0, nil
	}

	var totalConsumoPercent float64
	var totalTiempoMinutos float64
	lecturasProcesadas := 0

	for i := 0; i < len(filtered)-1; i++ {
		fuelAntiguo := filtered[i+1].FuelLevel // Lectura más antigua
		fuelReciente := filtered[i].FuelLevel  // Lectura más reciente

		consumo := fuelAntiguo - fuelReciente // Si es menor entonces consumio y por lo tanto es positivo
		tiempoMinutos := filtered[i].TS.Sub(filtered[i+1].TS).Minutes()

		// Hubo consumo y tiene un tiempo validio
		if consumo > 0 && tiempoMinutos > 0 && tiempoMinutos < 1440 {
			totalConsumoPercent += consumo
			totalTiempoMinutos += tiempoMinutos
			lecturasProcesadas++
		}
	}

	// Si no hay consumo no hacer nada, no activar la alerta
	if lecturasProcesadas == 0 || totalTiempoMinutos == 0 || totalConsumoPercent == 0 {
		return false, 0, nil
	}

	// Calculamos la tasa de consumo promedio por hora
	consumoPercentPorMinuto := totalConsumoPercent / totalTiempoMinutos
	consumoLitrosPorMinuto := (consumoPercentPorMinuto / 100.0) * tankCapacity

	// Calcular combustible actual y autonomía
	fuelActualLitros := (filtered[0].FuelLevel / 100.0) * tankCapacity

	if fuelActualLitros <= 0 { // tanque vacio si
		return true, 0, nil
	}

	autonomiaMinutos := fuelActualLitros / consumoLitrosPorMinuto
	autonomiaHoras := autonomiaMinutos / 60.0

	log.Printf("[FUEL] Dev:%d | Nivel:%.1f%% (%.1fL) | Consumo:%.4fL/min | Autonomía:%.1fh (%.0fmin) | Alerta:%v",
		deviceID,
		filtered[0].FuelLevel,
		fuelActualLitros,
		consumoLitrosPorMinuto,
		autonomiaHoras,
		autonomiaMinutos,
		autonomiaHoras < alertThresholdHours)

	// Deberia alerta si la autonomia es menor al umbral que tenemos
	debeAlertar := autonomiaHoras < alertThresholdHours

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

		alert := &domain.Alert{
			DeviceID: deviceID,
			Type:     domain.AlertFuelLow,
			TS:       time.Now().UTC(),
			Payload:  []byte(fmt.Sprintf(`{"autonomy_minutes":%.2f,"autonomy_hours":%.2f}`, autonomiaMinutos, autonomiaMinutos/60)),
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
