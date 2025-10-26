package main

import (
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/config"
	"github.com/nleea/fleet-monitoring/backend/internal/domain"
)

func hash(p string) string {
	b, _ := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	return string(b)
}

func firstOrCreateUser(db *gorm.DB, email, pass, role string) domain.User {
	var u domain.User
	if err := db.Where("email = ?", email).First(&u).Error; err == nil {
		return u
	}
	u = domain.User{
		Email:        email,
		PasswordHash: hash(pass),
		Role:         domain.Role(role),
	}
	if err := db.Create(&u).Error; err != nil {
		log.Fatalf("no se pudo crear user %s: %v", email, err)
	}
	return u
}

func main() {
	os.Setenv("ENV", "development")
	cfg := config.Load()
	app := appcore.New(cfg)

	admin := firstOrCreateUser(app.DB, os.Getenv("ADMIN_EMAIL"), os.Getenv("ADMIN_PASSWORD"), "admin")
	user := firstOrCreateUser(app.DB, "user@example.com", "user123", "user")

	var dev domain.Device
	if err := app.DB.Where("external_id = ?", "DEV-1234").First(&dev).Error; err != nil {
		dev = domain.Device{
			ExternalID: "DEV-1234",
			OwnerID:    admin.ID,
			MaskedID:   "DEV-****-1234",
		}
		if err := app.DB.Create(&dev).Error; err != nil {
			log.Fatalf("no se pudo crear device: %v", err)
		}
	}

	log.Printf("✅ Seed OK. Admin: %s | User: %s | Device: %s",
		admin.Email, user.Email, dev.ExternalID)
}
