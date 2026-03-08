package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"net"

	"github.com/bns/order-service/configs"
	"github.com/bns/order-service/internal/service"
	grpc_transport "github.com/bns/order-service/internal/transport/grpc"
	"google.golang.org/grpc"
)

type Server interface {
	Serve(ctx context.Context) error
}

type server struct {
	srv *grpc.Server
	cfg *configs.Config
}

func New(cfg *configs.Config, services *service.Services) Server {
	grpcServer := grpc.NewServer()
	transportServer := grpc_transport.NewServer(services)
	transportServer.Register(grpcServer)

	return &server{
		srv: grpcServer,
		cfg: cfg,
	}
}

func (s *server) Serve(ctx context.Context) error {
	errCh := make(chan error)

	go func() {
		lis, err := net.Listen("tcp", s.cfg.GRPC.Port)
		if err != nil {
			errCh <- fmt.Errorf("failed to listen for gRPC: %w", err)
			return
		}
		slog.Info("gRPC server started", slog.String("port", s.cfg.GRPC.Port))
		if err := s.srv.Serve(lis); err != nil {
			errCh <- fmt.Errorf("gRPC server failed: %w", err)
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("shutting down gRPC server...")
		s.srv.GracefulStop()
		slog.Info("gRPC server stopped.")
	}

	return nil
}
