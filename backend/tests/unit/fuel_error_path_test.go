package unit

import (
	"errors"
	"testing"

	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
	"github.com/nleea/fleet-monitoring/backend/internal/service"
	"github.com/stretchr/testify/assert"
)

type FailingSensorRepo struct{}

func (f *FailingSensorRepo) GetRecentByDevice(deviceID uint, limit int) ([]domain.SensorData, error) {
	return nil, errors.New("db failure")
}
func (f *FailingSensorRepo) Create(data *domain.SensorData) error { return nil }

func TestPredictiveFuelCheck_DBError(t *testing.T) {
	svc := service.NewSensorService(&FailingSensorRepo{}, repository.NewAlertRepository(nil), nil, repository.NewDeviceRepository(nil))

	trigger, autonomy, err := svc.PredictiveFuelCheck(1)
	assert.Error(t, err)
	assert.False(t, trigger)
	assert.Equal(t, 0.0, autonomy)
}
