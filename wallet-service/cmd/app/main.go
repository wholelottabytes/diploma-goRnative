package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/bns/wallet-service/configs"
	"github.com/bns/wallet-service/internal/app"
	"github.com/bns/wallet-service/internal/repository/postgres"
	"github.com/bns/wallet-service/internal/server"
	"github.com/bns/wallet-service/internal/service"
	walletservice "github.com/bns/wallet-service/internal/service/wallet"
	"github.com/bns/wallet-service/internal/transport/rest"
	_ "github.com/lib/pq"
)

import "github.com/bns/pkg/logger"

func main() {
	logger.InitLogger()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := configs.NewConfig()
	if err != nil {
		slog.Error("failed to load config", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("config loaded")

	db, err := sql.Open("postgres", cfg.Postgres.DSN)
	if err != nil {
		slog.Error("failed to connect to postgres", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		slog.Error("failed to ping postgres", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("database connected")

	walletRepo := postgres.New(db)
	if err := walletRepo.Init(ctx); err != nil {
		slog.Error("failed to init database schema", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("database schema initialized")
	walletSvc := walletservice.NewWalletService(walletRepo)
	services := service.New(walletSvc, cfg)
	restHandler := rest.NewHandler(services)
	mainServer := server.New(cfg, services, restHandler)
	application := app.New(mainServer)

	if err := application.Run(ctx); err != nil {
		slog.Error("app run error", slog.String("error", err.Error()))
		stop()
		os.Exit(1)
	}

	slog.Info("app stopped gracefully")
}
