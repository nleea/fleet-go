package api

import (
	"github.com/nleea/fleet-monitoring/backend/internal/config"
)


type App struct {
	Config *config.Config
}

func NewApp(cfg *config.Config) *App {
	return &App{Config: cfg}
}
