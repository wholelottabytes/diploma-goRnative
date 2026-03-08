package grpc

import (
	"github.com/bns/user-service/internal/service"
	"github.com/bns/user-service/internal/transport/grpc/user"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	userHandler := user.NewHandler(s.services.User)
	userHandler.RegisterWithServer(grpcServer)
}
