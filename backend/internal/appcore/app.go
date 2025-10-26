package appcore

import (
	"github.com/nleea/fleet-monitoring/internal/config"
	"github.com/nleea/fleet-monitoring/internal/utils"
	"github.com/nleea/fleet-monitoring/internal/ws"
	"github.com/nleea/fleet-monitoring/pkg/db"
	"gorm.io/gorm"
)

type App struct {
	Config *config.Config
	DB     *gorm.DB
	Logger *utils.Logger
	Hub    *ws.Hub
}

func New(cfg *config.Config) *App {
	// LOGGER
	logger := utils.NewLogger(cfg.Env)

	// BD
	database, err := db.ConnectPostgres(cfg.DB_DSN)
	if err != nil {
		logger.Fatal("❌ No se pudo conectar a la base de datos", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	app := &App{
		Config: cfg,
		DB:     database,
		Logger: logger,
		Hub:    hub,
	}

	logger.Info("✅ App inicializada correctamente")
	return app
}
