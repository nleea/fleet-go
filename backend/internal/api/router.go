package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/backend/internal/api/auth"
	"github.com/nleea/fleet-monitoring/backend/internal/api/devices"
	"github.com/nleea/fleet-monitoring/backend/internal/api/sensors"
	"github.com/nleea/fleet-monitoring/backend/internal/api/user"

	"github.com/nleea/fleet-monitoring/backend/internal/appcore"

	"github.com/nleea/fleet-monitoring/backend/internal/middleware"

	wsapi "github.com/nleea/fleet-monitoring/backend/internal/api/ws"
)

func SetupRouter(app *appcore.App) *gin.Engine {
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "env": app.Config.Env})
	})

	v1 := r.Group("/api/v1")

	auth.RegisterRoutes(v1, app)

	protected := v1.Group("/protected")
	protected.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))
	protected.GET("/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": c.GetUint("userID"),
			"role":    c.GetString("role"),
		})
	})

	sensorsGroup := protected.Group("/sensors")
	sensorsGroup.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))
	sensors.RegisterRoutes(sensorsGroup, app)

	devicesgroup := protected.Group("/devices")
	devicesgroup.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))
	devices.RegisterRoutes(devicesgroup, app)

	usergroup := protected.Group("/user")
	usergroup.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))
	user.RegisterRoutes(usergroup, app)

	wsapi.RegisterRoutes(v1, app, app.Hub)

	return r
}
