package app

import (
	"context"
	"log/slog"

	"github.com/bns/auth-service/internal/server"
	"golang.org/x/sync/errgroup"
)

type Consumer interface {
	Run(ctx context.Context)
	Close() error
}

type App struct {
	server    server.Server
	consumers []Consumer
}

func New(server server.Server, consumers ...Consumer) *App {
	return &App{
		server:    server,
		consumers: consumers,
	}
}

func (a *App) Run(ctx context.Context) error {
	eg, gCtx := errgroup.WithContext(ctx)

	eg.Go(func() error {
		return a.server.Serve(gCtx)
	})

	for _, c := range a.consumers {
		consumer := c
		eg.Go(func() error {
			consumer.Run(gCtx)
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		slog.Error("application run finished with error", slog.String("error", err.Error()))
		return err
	}

	slog.Info("shutting down consumers")
	for _, c := range a.consumers {
		if err := c.Close(); err != nil {
			slog.Error("failed to close consumer", slog.String("error", err.Error()))
		}
	}

	return nil
}
