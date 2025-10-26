package main

import (
	"fmt"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/config"
	"github.com/nleea/fleet-monitoring/backend/internal/domain"
)

// Generar hash de contraseña
func hash(p string) string {
	b, _ := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	return string(b)
}

// Crear usuario si no existe
func firstOrCreateUser(db *gorm.DB, email, pass, role string) domain.User {
	var u domain.User
	if err := db.Where("email = ?", email).First(&u).Error; err == nil {
		log.Printf("👤 Usuario %s ya existe", email)
		return u
	}
	u = domain.User{
		Email:        email,
		PasswordHash: hash(pass),
		Role:         domain.Role(role),
	}
	if err := db.Create(&u).Error; err != nil {
		log.Fatalf("❌ No se pudo crear user %s: %v", email, err)
	}
	log.Printf("✅ Usuario creado: %s (%s)", email, role)
	return u
}

// Migrar modelos principales
func autoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&domain.User{},
		&domain.Device{},
		&domain.SensorData{},
		&domain.Alert{},
	)
	if err != nil {
		log.Fatalf("❌ Error al migrar modelos: %v", err)
	}
	log.Println("✅ Migraciones completadas correctamente")
}

// Crear varios dispositivos de ejemplo
func seedDevices(db *gorm.DB, ownerID uint, count int) {
	for i := 1; i <= count; i++ {
		externalID := fmt.Sprintf("DEV-%04d", i)
		var existing domain.Device
		if err := db.Where("external_id = ?", externalID).First(&existing).Error; err == nil {
			continue
		}
		device := domain.Device{
			ExternalID: externalID,
			MaskedID:   fmt.Sprintf("DEV-****-%02d", i),
			OwnerID:    ownerID,
		}
		if err := db.Create(&device).Error; err != nil {
			log.Fatalf("❌ No se pudo crear device %s: %v", externalID, err)
		}
		log.Printf("📟 Dispositivo creado: %s", externalID)
	}
}

func main() {
	// Variables de entorno por defecto
	if os.Getenv("ENV") == "" {
		os.Setenv("ENV", "development")
	}
	if os.Getenv("ADMIN_EMAIL") == "" {
		os.Setenv("ADMIN_EMAIL", "admin@example.com")
	}
	if os.Getenv("ADMIN_PASSWORD") == "" {
		os.Setenv("ADMIN_PASSWORD", "admin123")
	}

	cfg := config.Load()
	app := appcore.New(cfg)

	// 1️⃣ Ejecutar migraciones
	autoMigrate(app.DB)

	// 2️⃣ Crear usuarios
	admin := firstOrCreateUser(app.DB, os.Getenv("ADMIN_EMAIL"), os.Getenv("ADMIN_PASSWORD"), "admin")
	user := firstOrCreateUser(app.DB, "user@example.com", "user123", "user")

	// 3️⃣ Crear 5 dispositivos del admin
	seedDevices(app.DB, admin.ID, 5)

	log.Printf("✅ Seed completo. Admin: %s | User: %s", admin.Email, user.Email)
}
