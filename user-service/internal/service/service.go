package service

import (
	"github.com/bns/user-service/configs"
	userservice "github.com/bns/user-service/internal/service/user"
)

type Services struct {
	User   *userservice.UserService
	Config *configs.Config
}

func New(userService *userservice.UserService, cfg *configs.Config) *Services {
	return &Services{
		User:   userService,
		Config: cfg,
	}
}
