package service

import (
	"github.com/nleea/fleet-monitoring/backend/internal/domain"
	"github.com/nleea/fleet-monitoring/backend/internal/repository"
)

type UserService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) Create(user *domain.User) error {
	return s.userRepo.Create(user)
}