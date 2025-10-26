package sensors

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/internal/appcore"
	"github.com/nleea/fleet-monitoring/internal/repository"
	"github.com/nleea/fleet-monitoring/internal/service"
)

type sensorInput struct {
	DeviceID    uint    `json:"device_id" binding:"required"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Speed       float64 `json:"speed"`
	FuelLevel   float64 `json:"fuel_level"`
	Temperature float64 `json:"temperature"`
	TS        time.Time `json:"ts" binding:"required"`
}

func RegisterRoutes(rg *gin.RouterGroup, app *appcore.App) {
	group := rg.Group("/")

	sensorRepo := repository.NewSensorRepository(app.DB)
	alertRepo := repository.NewAlertRepository(app.DB)
	sensorService := service.NewSensorService(sensorRepo, alertRepo, app.Hub, repository.NewDeviceRepository(app.DB))

	group.POST("/data", func(c *gin.Context) {
		var input sensorInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
			return
		}

		err := sensorService.IngestData(
			input.DeviceID,
			input.Lat,
			input.Lng,
			input.Speed,
			input.FuelLevel,
			input.Temperature,
			input.TS,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "data received"})
	})

	group.GET("/data/:device_id", func(c *gin.Context) {
		deviceIDParam := c.Param("device_id")
		var deviceID uint
		if _, err := fmt.Sscanf(deviceIDParam, "%d", &deviceID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device_id"})
			return
		}

		data, err := sensorService.GetSensorDataByDeviceID(deviceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if data == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No data found"})
			return
		}

		c.JSON(http.StatusOK, data)
	})
}
