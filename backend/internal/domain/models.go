package domain

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type User struct {
	ID           uint           `gorm:"primaryKey"`
	Email        string         `gorm:"uniqueIndex;size:180;not null"`
	PasswordHash string         `gorm:"not null"`
	Role         Role           `gorm:"type:VARCHAR(10);not null;default:'user'"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

type Device struct {
	ID         uint           `gorm:"primaryKey"`
	ExternalID string         `gorm:"uniqueIndex;size:64;not null"`
	OwnerID    uint           `gorm:"index;not null"`
	Owner      User           `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	MaskedID   string         `gorm:"size:64;index"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
}

type SensorData struct {
	Channel   string    `gorm:"-:all"`
	ID          uint      `gorm:"primaryKey"`
	DeviceID    uint      `gorm:"index;not null"`
	TS          time.Time `gorm:"index;not null"`
	Lat         float64
	Lng         float64
	Speed       float64
	FuelLevel   float64
	Temperature float64
}

type AlertType string

const (
	AlertFuelLow AlertType = "fuel_low_autonomy"
)

type Alert struct {
	Channel   string    `gorm:"-:all"`
	ID        uint      `gorm:"primaryKey"`
	DeviceID  uint      `gorm:"index;not null"`
	TS        time.Time `gorm:"index;not null"`
	Type      AlertType `gorm:"size:64;index;not null"`
	Payload   []byte    `gorm:"type:jsonb"`
	Ack       bool      `gorm:"default:false;index"`
	CreatedAt time.Time
}
