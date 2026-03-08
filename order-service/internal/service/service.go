package service

import (
	"github.com/bns/order-service/configs"
	orderservice "github.com/bns/order-service/internal/service/order"
)

type Services struct {
	Order  *orderservice.OrderService
	Config *configs.Config
}

func New(orderService *orderservice.OrderService, cfg *configs.Config) *Services {
	return &Services{
		Order:  orderService,
		Config: cfg,
	}
}
