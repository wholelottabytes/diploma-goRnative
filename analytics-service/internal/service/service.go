package service

import (
	"github.com/bns/analytics-service/configs"
	analyticsservice "github.com/bns/analytics-service/internal/service/analytics"
)

type Services struct {
	Analytics *analyticsservice.AnalyticsService
	Config    *configs.Config
}

func New(analyticsService *analyticsservice.AnalyticsService, cfg *configs.Config) *Services {
	return &Services{
		Analytics: analyticsService,
		Config:    cfg,
	}
}
