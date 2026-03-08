package server

import (
	"context"
	"log/slog"

	"github.com/bns/auth-service/configs"
	"github.com/bns/auth-service/internal/service"
	"github.com/bns/auth-service/internal/server/grpc"
	"github.com/bns/auth-service/internal/server/http"
	"github.com/bns/auth-service/internal/transport/rest"
	"golang.org/x/sync/errgroup"
)

type Server interface {
	Serve(ctx context.Context) error
}

type server struct {
	servers []Server
}

func New(cfg *configs.Config, services *service.Services, restHandler *rest.Handler) Server {
	return &server{
		servers: []Server{
			http.New(cfg, restHandler),
			grpc.New(cfg, services),
		},
	}
}

func (s *server) Serve(ctx context.Context) error {
	g, ctx := errgroup.WithContext(ctx)

	for _, srv := range s.servers {
		srv := srv
		g.Go(func() error {
			return srv.Serve(ctx)
		})
	}

	slog.Info("servers are running...")

	if err := g.Wait(); err != nil {
		slog.Error("server group error", slog.String("error", err.Error()))
		return err
	}

	slog.Info("servers are shutting down.")
	return nil
}
