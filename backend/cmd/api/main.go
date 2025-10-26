package main

import (
	"log"

	"github.com/nleea/fleet-monitoring/backend/internal/api"
	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/config"
)

func main() {
	cfg := config.Load()
	app := appcore.New(cfg)
	r := api.SetupRouter(app)

	log.Printf("🚀 Servidor corriendo en :%s", cfg.Port)
	r.Run(":" + cfg.Port)
}
