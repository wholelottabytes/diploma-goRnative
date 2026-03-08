package grpc

import (
	"github.com/bns/order-service/internal/service"
	"github.com/bns/order-service/internal/transport/grpc/order"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	orderHandler := order.NewHandler(s.services.Order)
	orderHandler.Register(grpcServer)
}
