package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      string
	DB_DSN    string
	JWTSecret string
	Env       string
}

func Load() *Config {
	rootPath, _ := os.Getwd()

	envPath := filepath.Join(rootPath, ".env")
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		envPath = filepath.Join(rootPath, "../.env")
	}

	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️  No se pudo cargar .env desde %s: %v", envPath, err)
	}

	return &Config{
		Port:      getEnv("PORT", "8080"),
		DB_DSN:    getEnv("DB_DSN", ""),
		JWTSecret: getEnv("JWT_SECRET", ""),
		Env:       getEnv("ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
