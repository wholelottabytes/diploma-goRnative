package grpc

import (
	"github.com/bns/auth-service/internal/service"
	"github.com/bns/auth-service/internal/transport/grpc/auth"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	authHandler := auth.NewHandler(s.services.Auth)
	authHandler.Register(grpcServer)
}
