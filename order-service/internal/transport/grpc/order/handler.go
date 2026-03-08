package order

import (
	"context"

	orderv1 "github.com/bns/api/proto/order/v1"
	orderservice "github.com/bns/order-service/internal/service/order"
	"google.golang.org/grpc"
)

type Handler struct {
	orderv1.UnimplementedOrderServiceServer
	orderService *orderservice.OrderService
}

func NewHandler(orderService *orderservice.OrderService) *Handler {
	return &Handler{
		orderService: orderService,
	}
}

func (h *Handler) Register(server *grpc.Server) {
	orderv1.RegisterOrderServiceServer(server, h)
}

func (h *Handler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
	// Implementation for creating an order
	return nil, nil
}

func (h *Handler) GetOrder(ctx context.Context, req *orderv1.GetOrderRequest) (*orderv1.GetOrderResponse, error) {
	// Implementation for getting an order
	return nil, nil
}
