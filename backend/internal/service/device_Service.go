package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
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
	n := len(id)
	if n == 0 {
		return "DEV-********"
	}
	if n <= 4 {
		return fmt.Sprintf("DEV-%s%s", strings.Repeat("*", n), id[n-1:])
	}
	if n <= 8 {
		return fmt.Sprintf("DEV-%s%s", strings.Repeat("*", n-3), id[n-3:])
	}
	return fmt.Sprintf("DEV-%s%s", strings.Repeat("*", n-4), id[n-4:])
}
