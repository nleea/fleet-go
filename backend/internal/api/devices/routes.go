package devices

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/internal/appcore"
	"github.com/nleea/fleet-monitoring/internal/middleware"
	"github.com/nleea/fleet-monitoring/internal/repository"
	"github.com/nleea/fleet-monitoring/internal/service"
)

type createDeviceInput struct {
	ExternalID string `json:"external_id" binding:"required"`
}

func RegisterRoutes(rg *gin.RouterGroup, app *appcore.App) {
	group := rg.Group("/")

	group.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))

	deviceRepo := repository.NewDeviceRepository(app.DB)
	deviceService := service.NewDeviceService(deviceRepo)

	group.GET("/all", middleware.RequireRoles("admin","user"), func(c *gin.Context) {
		devices, err := deviceService.ListAll()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, devices)
	})

	group.POST("/", middleware.RequireRoles("user", "admin"), func(c *gin.Context) {
		var input createDeviceInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
			return
		}

		userID := c.GetUint("userID")
		dev, err := deviceService.Register(userID, input.ExternalID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":          dev.ID,
			"external_id": dev.ExternalID,
			"masked_id":   dev.MaskedID,
			"owner_id":    dev.OwnerID,
		})
	})
}
