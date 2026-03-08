package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/bns/interaction-service/configs"
	"github.com/bns/interaction-service/internal/app"
	"github.com/bns/interaction-service/internal/repository/mongodb"
	"github.com/bns/interaction-service/internal/server"
	"github.com/bns/interaction-service/internal/service"
	interactionservice "github.com/bns/interaction-service/internal/service/interaction"
	"github.com/bns/interaction-service/internal/transport/rest"
	"github.com/bns/pkg/kafka"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	dbClient, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		slog.Error("failed to connect to mongo", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer func() {
		if err = dbClient.Disconnect(context.Background()); err != nil {
			slog.Error("failed to disconnect from mongo", slog.String("error", err.Error()))
		}
	}()
	pingErr := dbClient.Ping(ctx, nil)
	if pingErr != nil {
		slog.Error("failed to ping mongo", slog.String("error", pingErr.Error()))
		os.Exit(1)
	}
	db := dbClient.Database(cfg.Mongo.Database)
	slog.Info("database connected")

	kafkaProducer := kafka.NewProducer(cfg.Kafka.Brokers, "interaction_events")
	defer func() {
		if err := kafkaProducer.Close(); err != nil {
			slog.Error("failed to close kafka producer", slog.String("error", err.Error()))
		}
	}()

	interactionRepo := mongodb.New(db)
	interactionSvc := interactionservice.NewInteractionService(interactionRepo, kafkaProducer)
	services := service.New(interactionSvc, cfg)
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
