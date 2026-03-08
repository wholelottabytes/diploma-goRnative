package grpc

import (
	"github.com/bns/interaction-service/internal/service"
	"github.com/bns/interaction-service/internal/transport/grpc/interaction"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	interactionHandler := interaction.NewHandler(s.services.Interaction)
	interactionHandler.Register(grpcServer)
}
