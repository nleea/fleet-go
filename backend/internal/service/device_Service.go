package service

import (
	"errors"
	"fmt"

	"github.com/nleea/fleet-monitoring/internal/domain"
	"github.com/nleea/fleet-monitoring/internal/repository"
)

type DeviceService struct {
	repo repository.DeviceRepository
}

func NewDeviceService(repo repository.DeviceRepository) *DeviceService {
	return &DeviceService{repo: repo}
}

func (s *DeviceService) Register(ownerID uint, externalID string) (*domain.Device, error) {
	if externalID == "" {
		return nil, errors.New("external_id requerido")
	}

	existing, _ := s.repo.GetByExternalID(externalID)
	if existing != nil && existing.ID != 0 {
		return nil, errors.New("ya existe un dispositivo con ese ID externo")
	}

	dev := &domain.Device{
		ExternalID: externalID,
		OwnerID:    ownerID,
		MaskedID:   maskExternalID(externalID),
	}

	if err := s.repo.Create(dev); err != nil {
		return nil, err
	}
	return dev, nil
}

func (s *DeviceService) ListAll() ([]domain.Device, error) {
	return s.repo.GetAll()
}

func (s *DeviceService) ListByOwner(userID uint) ([]domain.Device, error) {
	return s.repo.GetByOwner(userID)
}

func maskExternalID(id string) string {
	if len(id) < 4 {
		return "DEV-****"
	}
	return fmt.Sprintf("DEV-****-%s", id[len(id)-4:])
}
