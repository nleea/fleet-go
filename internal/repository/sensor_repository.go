package repository

import (
	"github.com/nleea/fleet-monitoring/internal/domain"
	"gorm.io/gorm"
)

type SensorRepository interface {
	Create(data *domain.SensorData) error
	GetRecentByDevice(deviceID uint, limit int) ([]domain.SensorData, error)
}

type sensorRepository struct {
	db *gorm.DB
}

func NewSensorRepository(db *gorm.DB) SensorRepository {
	return &sensorRepository{db: db}
}

func (r *sensorRepository) Create(data *domain.SensorData) error {
	return r.db.Create(data).Error
}

func (r *sensorRepository) GetRecentByDevice(deviceID uint, limit int) ([]domain.SensorData, error) {
	var records []domain.SensorData
	err := r.db.Where("device_id = ?", deviceID).Order("ts desc").Limit(limit).Find(&records).Error
	return records, err
}
