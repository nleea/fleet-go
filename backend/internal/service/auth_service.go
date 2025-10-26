package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/nleea/fleet-monitoring/backend/internal/repository"
	"github.com/nleea/fleet-monitoring/backend/internal/utils"
)

type AuthService struct {
	DB        *gorm.DB
	JWTSecret []byte
}

func NewAuthService(db *gorm.DB, secret string) *AuthService {
	return &AuthService{DB: db, JWTSecret: []byte(secret)}
}

func (s *AuthService) Login(email, password string) (string, error) {
	user, err := repository.NewUserRepository(s.DB).FindByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("usuario no encontrado")
		}
		return "", err
	}

	if !utils.CheckPassword(user.PasswordHash, password)  {
		return "", errors.New("credenciales inválidas")
	}

	payload := utils.JWTPayload{
		Sub:   user.ID,
		Role:  string(user.Role),
		Email: user.Email,
		Iat:   time.Now(),
		Exp:   time.Now().Add(24 * time.Hour).Unix(),
	}

	token, err := utils.SignJWT(s.JWTSecret, payload)
	if err != nil {
		return "", err
	}

	return token, nil
}
