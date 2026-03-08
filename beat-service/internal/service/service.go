package service

import (
	"github.com/bns/beat-service/configs"
	beatservice "github.com/bns/beat-service/internal/service/beat"
)

type Services struct {
	Beat   *beatservice.BeatService
	Config *configs.Config
}

func New(beatService *beatservice.BeatService, cfg *configs.Config) *Services {
	return &Services{
		Beat:   beatService,
		Config: cfg,
	}
}
