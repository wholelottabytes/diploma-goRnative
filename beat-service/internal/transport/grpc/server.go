package grpc

import (
	"github.com/bns/beat-service/internal/service"
	"github.com/bns/beat-service/internal/transport/grpc/beat"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	beatHandler := beat.NewHandler(s.services.Beat)
	beatHandler.Register(grpcServer)
}
