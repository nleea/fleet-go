package unit

import (
	"testing"
	"time"

	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
	"github.com/nleea/fleet-monitoring/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestPredictiveFuelCheck_NoData(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	_ = db.AutoMigrate(&domain.SensorData{}, &domain.Device{})
	svc := service.NewSensorService(repository.NewSensorRepository(db),
		repository.NewAlertRepository(db),
		nil, repository.NewDeviceRepository(db))

	device := domain.Device{ExternalID: "DEV-NODATA"}
	db.Create(&device)

	trigger, autonomy, err := svc.PredictiveFuelCheck(device.ID)
	assert.NoError(t, err)
	assert.False(t, trigger)
	assert.Equal(t, float64(0), autonomy)
}

func TestPredictiveFuelCheck_TankAlmostEmpty(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	_ = db.AutoMigrate(&domain.SensorData{}, &domain.Device{})
	svc := service.NewSensorService(repository.NewSensorRepository(db),
		repository.NewAlertRepository(db),
		nil, repository.NewDeviceRepository(db))

	device := domain.Device{ExternalID: "DEV-EMPTY"}
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

	trigger, autonomy, err := svc.PredictiveFuelCheck(device.ID)
	assert.NoError(t, err)
	assert.True(t, trigger, "Tanque casi vacío debe activar alerta")
	assert.Equal(t, float64(5), autonomy)
}
