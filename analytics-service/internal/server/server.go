package server

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/bns/analytics-service/configs"
	"github.com/bns/analytics-service/internal/service"
	"github.com/bns/analytics-service/internal/transport/rest"
	"github.com/gin-gonic/gin"
)

type Server interface {
	Serve(ctx context.Context) error
}

type server struct {
	cfg         *configs.Config
	services    *service.Services
	restHandler *rest.Handler
}

func New(cfg *configs.Config, services *service.Services, restHandler *rest.Handler) Server {
	return &server{
		cfg:         cfg,
		services:    services,
		restHandler: restHandler,
	}
}

func (s *server) Serve(ctx context.Context) error {
	router := gin.Default()
	s.restHandler.RegisterRoutes(router)

	httpServer := &http.Server{
		Addr:         s.cfg.HTTP.Port,
		Handler:      router,
		ReadTimeout:  s.cfg.HTTP.ReadTimeout,
		WriteTimeout: s.cfg.HTTP.WriteTimeout,
	}

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("failed to start http server", slog.String("error", err.Error()))
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), s.cfg.HTTP.ShutdownTimeout)
	defer cancel()

	return httpServer.Shutdown(shutdownCtx)
}
