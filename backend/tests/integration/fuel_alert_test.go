package integration

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
	"github.com/nleea/fleet-monitoring/backend/internal/service"
)

func TestPredictiveFuelCheck_ShouldTriggerAlert(t *testing.T) {

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)
	_ = db.AutoMigrate(&domain.SensorData{}, &domain.Device{})

	sensorRepo := repository.NewSensorRepository(db)
	alertRepo := repository.NewAlertRepository(db)
	deviceRepo := repository.NewDeviceRepository(db)
	svc := service.NewSensorService(sensorRepo, alertRepo, nil, deviceRepo)

	device := domain.Device{ExternalID: "DEV-TEST"}
	db.Create(&device)

	now := time.Now()
	readings := []domain.SensorData{
		{DeviceID: device.ID, FuelLevel: 100, TS: now.Add(-60 * time.Minute)},
		{DeviceID: device.ID, FuelLevel: 80, TS: now.Add(-50 * time.Minute)},
		{DeviceID: device.ID, FuelLevel: 60, TS: now.Add(-40 * time.Minute)},
		{DeviceID: device.ID, FuelLevel: 40, TS: now.Add(-20 * time.Minute)},
		{DeviceID: device.ID, FuelLevel: 20, TS: now.Add(-10 * time.Minute)},
		{DeviceID: device.ID, FuelLevel: 10, TS: now},
	}

	for _, r := range readings {
		db.Create(&r)
	}

	should, autonomiaMin, err := svc.PredictiveFuelCheck(device.ID)

	assert.NoError(t, err)
	assert.True(t, should, "Debería activarse la alerta de combustible crítico")
	assert.Less(t, autonomiaMin, 60.0, "Autonomía debe ser menor a 60 min")
	t.Logf("🔍 Autonomía calculada: %.1f min", autonomiaMin)
}
