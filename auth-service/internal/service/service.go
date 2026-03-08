package service

import (
	authservice "github.com/bns/auth-service/internal/service/auth"
)

type Services struct {
	Auth *authservice.AuthService
}

func New(authService *authservice.AuthService) *Services {
	return &Services{
		Auth: authService,
	}
}
