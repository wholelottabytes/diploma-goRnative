package http

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/bns/auth-service/configs"
	"github.com/bns/auth-service/internal/transport/rest"
	"github.com/gin-gonic/gin"
)

type Server interface {
	Serve(ctx context.Context) error
}

type server struct {
	srv             *http.Server
	shutdownTimeout time.Duration
}

func New(cfg *configs.Config, handler *rest.Handler) Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	handler.RegisterRoutes(router)

	return &server{
		srv: &http.Server{
			Addr:         cfg.HTTP.Port,
			Handler:      router,
			ReadTimeout:  cfg.HTTP.ReadTimeout,
			WriteTimeout: cfg.HTTP.WriteTimeout,
		},
		shutdownTimeout: cfg.HTTP.ShutdownTimeout,
	}
}

func (s *server) Serve(ctx context.Context) error {
	errCh := make(chan error)

	go func() {
		slog.Info("HTTP server started", slog.String("port", s.srv.Addr))
		if err := s.srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("http server error: %w", err)
	case <-ctx.Done():
		slog.Info("shutting down HTTP server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
		defer cancel()
		if err := s.srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("HTTP server shutdown failed", slog.String("error", err.Error()))
		}
		slog.Info("HTTP server stopped.")
	}

	return nil
}
