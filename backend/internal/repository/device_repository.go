package repository

import (
	"github.com/nleea/fleet-monitoring/internal/domain"
	"gorm.io/gorm"
)

type DeviceRepository interface {
	Create(device *domain.Device) error
	GetAll() ([]domain.Device, error)
	GetByOwner(userID uint) ([]domain.Device, error)
	GetByExternalID(extID string) (*domain.Device, error)
	GetByDeviceIdID(deviceId uint) (*domain.Device, error)

}

type deviceRepository struct {
	db *gorm.DB
}

func NewDeviceRepository(db *gorm.DB) DeviceRepository {
	return &deviceRepository{db: db}
}

func (r *deviceRepository) Create(device *domain.Device) error {
	return r.db.Create(device).Error
}

func (r *deviceRepository) GetAll() ([]domain.Device, error) {
	var devices []domain.Device
	err := r.db.Preload("Owner").Order("created_at desc").Find(&devices).Error
	return devices, err
}

func (r *deviceRepository) GetByOwner(userID uint) ([]domain.Device, error) {
	var devices []domain.Device
	err := r.db.Where("owner_id = ?", userID).Preload("Owner").Find(&devices).Error
	return devices, err
}

func (r *deviceRepository) GetByExternalID(extID string) (*domain.Device, error) {
	var device domain.Device
	err := r.db.Where("external_id = ?", extID).First(&device).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) GetByDeviceIdID(deviceId uint) (*domain.Device, error) {
	var device domain.Device
	err := r.db.Where("id = ?", deviceId).First(&device).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}