package service

import (
	"time"

	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
)

type AlertService struct {
	repo repository.AlertRepository
	app  *appcore.App
}

func NewAlertService(repo repository.AlertRepository, app *appcore.App) *AlertService {
	return &AlertService{repo: repo, app: app}
}

func (s *AlertService) Create(alert *domain.Alert) error {
	if err := s.repo.Create(alert); err != nil {
		return err
	}

	payload := map[string]any{
		"type":       alert.Type,
		"device_id":  alert.DeviceID,
		"timestamp":  alert.TS.Format(time.RFC3339),
		"ack":        alert.Ack,
		"payload":    string(alert.Payload),
		"created_at": time.Now().Format(time.RFC3339),
	}

	go s.app.Hub.Broadcast(
		"telemetry",
		payload,
		map[string]any{
			"timestamp": time.Now().Format(time.RFC3339),
			"source":    "SensorService",
		},
		"admin", "user",
	)

	s.app.Logger.Info("🚨 Alert broadcasted", "device_id", alert.DeviceID, "type", alert.Type)
	return nil
}

func (s *AlertService) ListUnacknowledged(limit int) ([]domain.Alert, error) {
	return s.repo.GetUnacknowledged(limit)
}

func (s *AlertService) Acknowledge(id uint) error {
	return s.repo.Acknowledge(id)
}
