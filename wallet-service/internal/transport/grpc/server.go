package grpc

import (
	"github.com/bns/wallet-service/internal/service"
	"github.com/bns/wallet-service/internal/transport/grpc/wallet"
	"google.golang.org/grpc"
)

type Server struct {
	services *service.Services
}

func NewServer(services *service.Services) *Server {
	return &Server{services: services}
}

func (s *Server) Register(grpcServer *grpc.Server) {
	walletHandler := wallet.NewHandler(s.services.Wallet)
	walletHandler.Register(grpcServer)
}
