package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/bns/analytics-service/configs"
	"github.com/bns/analytics-service/internal/app"
	clickhouserepo "github.com/bns/analytics-service/internal/repository/clickhouse"
	"github.com/bns/analytics-service/internal/server"
	"github.com/bns/analytics-service/internal/service"
	analyticsservice "github.com/bns/analytics-service/internal/service/analytics"
	"github.com/bns/analytics-service/internal/transport/kafka"
	"github.com/bns/analytics-service/internal/transport/rest"
	pkgkafka "github.com/bns/pkg/kafka"
	"github.com/bns/pkg/logger"
)

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

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: cfg.ClickHouse.Addresses,
		Auth: clickhouse.Auth{
			Database: cfg.ClickHouse.Database,
			Username: cfg.ClickHouse.Username,
			Password: cfg.ClickHouse.Password,
		},
	})
	if err != nil {
		slog.Error("failed to connect to clickhouse", slog.String("error", err.Error()))
		os.Exit(1)
	}
	if err := conn.Ping(ctx); err != nil {
		slog.Error("failed to ping clickhouse", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("clickhouse connected")

	analyticsRepo := clickhouserepo.New(conn)
	if err := analyticsRepo.Init(ctx); err != nil {
		slog.Error("failed to init clickhouse schema", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("clickhouse schema initialized")
	analyticsSvc := analyticsservice.NewAnalyticsService(analyticsRepo)
	services := service.New(analyticsSvc, cfg)

	// Kafka Consumer
	consumerGroup := pkgkafka.NewConsumerGroup(cfg.Kafka.Brokers, cfg.Kafka.GroupID)
	eventConsumer := kafka.NewEventConsumer(services, consumerGroup, cfg.Kafka.Topics)

	// REST Handler
	restHandler := rest.NewHandler(services)

	mainServer := server.New(cfg, services, restHandler)
	application := app.New(mainServer, eventConsumer)

	if err := application.Run(ctx); err != nil {
		slog.Error("app run error", slog.String("error", err.Error()))
		stop()
		os.Exit(1)
	}

	slog.Info("app stopped gracefully")
}
