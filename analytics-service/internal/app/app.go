package app

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/bns/analytics-service/internal/server"
	"golang.org/x/sync/errgroup"
)

// Consumer defines the interface for a background process that can be run and closed.
type Consumer interface {
	Run(ctx context.Context)
	Close() error
}

// App is the main application that runs the HTTP server and any background consumers.
type App struct {
	server    server.Server
	consumers []Consumer
}

// New creates a new App instance.
func New(server server.Server, consumers ...Consumer) *App {
	return &App{
		server:    server,
		consumers: consumers,
	}
}

// Run starts the application's server and consumers and waits for them to complete.
func (a *App) Run(ctx context.Context) error {
	eg, gCtx := errgroup.WithContext(ctx)

	// Start the HTTP server if it exists.
	if a.server != nil {
		eg.Go(func() error {
			slog.Info("http server starting")
			err := a.server.Serve(gCtx)
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				slog.Error("http server failed", "error", err)
				return err
			}
			slog.Info("http server stopped")
			return nil
		})
	}

	// Start all consumers.
	for _, c := range a.consumers {
		consumer := c // capture range variable
		eg.Go(func() error {
			slog.Info("consumer starting")
			consumer.Run(gCtx)
			slog.Info("consumer stopped")
			return nil
		})
	}

	// Wait for all components to finish.
	if err := eg.Wait(); err != nil {
		slog.Error("application run finished with an error", "error", err)
	}

	// Shutdown consumers gracefully.
	slog.Info("shutting down consumers")
	for _, c := range a.consumers {
		if err := c.Close(); err != nil {
			slog.Error("failed to close consumer", "error", err.Error())
		}
	}

	return nil
}
