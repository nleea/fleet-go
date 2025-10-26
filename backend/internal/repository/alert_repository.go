package repository

import (
	"time"

	"github.com/nleea/fleet-monitoring/internal/domain"
	"gorm.io/gorm"
)

type AlertRepository interface {
	Create(alert *domain.Alert) error
	GetRecentByDevice(deviceID uint, since time.Time) ([]domain.Alert, error)
	ExistsSimilar(deviceID uint, alertType domain.AlertType, window time.Duration) (bool, error)
	GetUnacknowledged(limit int) ([]domain.Alert, error)
	Acknowledge(alertID uint) error
}

type alertRepository struct {
	db *gorm.DB
}

func NewAlertRepository(db *gorm.DB) AlertRepository {
	return &alertRepository{db: db}
}

func (r *alertRepository) Create(alert *domain.Alert) error {
	return r.db.Create(alert).Error
}

func (r *alertRepository) GetRecentByDevice(deviceID uint, since time.Time) ([]domain.Alert, error) {
	var alerts []domain.Alert
	err := r.db.Where("device_id = ? AND ts >= ?", deviceID, since).
		Order("ts desc").
		Find(&alerts).Error
	return alerts, err
}

func (r *alertRepository) ExistsSimilar(deviceID uint, alertType domain.AlertType, window time.Duration) (bool, error) {
	var count int64
	cutoff := time.Now().Add(-window)
	err := r.db.Model(&domain.Alert{}).
		Where("device_id = ? AND type = ? AND ts >= ?", deviceID, alertType, cutoff).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *alertRepository) GetUnacknowledged(limit int) ([]domain.Alert, error) {
	var alerts []domain.Alert
	err := r.db.Where("ack = false").
		Order("ts desc").
		Limit(limit).
		Find(&alerts).Error
	return alerts, err
}

func (r *alertRepository) Acknowledge(alertID uint) error {
	return r.db.Model(&domain.Alert{}).
		Where("id = ?", alertID).
		Update("ack", true).Error
}
