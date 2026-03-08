package service

import (
	"github.com/bns/interaction-service/configs"
	interactionservice "github.com/bns/interaction-service/internal/service/interaction"
)

type Services struct {
	Interaction *interactionservice.InteractionService
	Config      *configs.Config
}

func New(interactionService *interactionservice.InteractionService, cfg *configs.Config) *Services {
	return &Services{
		Interaction: interactionService,
		Config:      cfg,
	}
}
