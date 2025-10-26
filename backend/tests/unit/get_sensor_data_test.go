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

func TestGetSensorDataByDeviceID(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	_ = db.AutoMigrate(&domain.SensorData{}, &domain.Device{})

	sensorRepo := repository.NewSensorRepository(db)
	svc := service.NewSensorService(sensorRepo, repository.NewAlertRepository(db), nil, repository.NewDeviceRepository(db))

	device := domain.Device{ExternalID: "DEV-DATA"}
	db.Create(&device)

	now := time.Now()
	db.Create(&domain.SensorData{DeviceID: device.ID, FuelLevel: 90, TS: now.Add(-2 * time.Minute)})
	db.Create(&domain.SensorData{DeviceID: device.ID, FuelLevel: 80, TS: now})

	data, err := svc.GetSensorDataByDeviceID(device.ID)
	assert.NoError(t, err)
	assert.NotNil(t, data)
	assert.GreaterOrEqual(t, len(*data), 2)
}
