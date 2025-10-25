package db

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// TEST para la conexion
	if err := sqlDB.Ping(); err != nil {
		log.Printf("⚠️  No se pudo verificar conexión: %v", err)
	}

	log.Println("✅ Conectado a PostgreSQL")
	return db, nil
}
