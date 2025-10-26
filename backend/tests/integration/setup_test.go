package integration

import (
	"log"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/nleea/fleet-monitoring/backend/internal/api"
	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/config"
	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/utils"
	"github.com/nleea/fleet-monitoring/backend/internal/ws"
)

var testApp *appcore.App
var testRouter *gin.Engine

func TestMain(m *testing.M) {
	// DB en memoria para pruebas
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Error al crear DB de prueba: %v", err)
	}

	_ = db.AutoMigrate(&domain.Device{}, &domain.SensorData{}, &domain.Alert{}, &domain.User{})

	// Config para JWT y entorno
	cfg := config.Load()

	// Inicializa Hub WS y App
	hub := ws.NewHub()
	go hub.Run()

	testApp = &appcore.App{
		DB:     db,
		Config: cfg,
		Hub:    hub,
	}

	testRouter = api.SetupRouter(testApp)

	hashed, _ := utils.HashPassword("admin123")
	user := domain.User{
		Email:    "admin@example.com",
		PasswordHash: hashed,
		Role:     "admin",
	}
	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("❌ Error creando usuario de prueba: %v", err)
	}

	code := m.Run()
	os.Exit(code)
}
