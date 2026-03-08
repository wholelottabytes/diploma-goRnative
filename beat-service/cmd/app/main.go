package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/bns/beat-service/configs"
	"github.com/bns/beat-service/internal/app"
	"github.com/bns/beat-service/internal/clients/user"
	"github.com/bns/beat-service/internal/repository/elasticsearch"
	"github.com/bns/beat-service/internal/repository/minio"
	"github.com/bns/beat-service/internal/server"
	"github.com/bns/beat-service/internal/service"
	beatservice "github.com/bns/beat-service/internal/service/beat"
	"github.com/bns/beat-service/internal/transport/rest"
	"github.com/bns/pkg/kafka"
	esv8 "github.com/elastic/go-elasticsearch/v8"
	miniov7 "github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
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

	esClient, err := esv8.NewClient(esv8.Config{
		Addresses: cfg.Elasticsearch.Addresses,
	})
	if err != nil {
		slog.Error("failed to create elasticsearch client", slog.String("error", err.Error()))
		os.Exit(1)
	}
	if _, err = esClient.Info(); err != nil {
		slog.Error("failed to connect to elasticsearch", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("elasticsearch connected")

	minioClient, err := miniov7.New(cfg.MinIO.Endpoint, &miniov7.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIO.AccessKeyID, cfg.MinIO.SecretAccessKey, ""),
		Secure: cfg.MinIO.UseSSL,
	})
	if err != nil {
		slog.Error("failed to create minio client", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("minio client created")

	kafkaProducer := kafka.NewProducer(cfg.Kafka.Brokers, "beat_events")
	defer func() {
		if err := kafkaProducer.Close(); err != nil {
			slog.Error("failed to close kafka producer", slog.String("error", err.Error()))
		}
	}()

	beatRepo := elasticsearch.New(esClient)
	fileRepo := minio.New(minioClient)

	userClient, err := user.NewClient(cfg.Clients.UserServiceAddr)
	if err != nil {
		slog.Error("failed to create user client", slog.String("error", err.Error()))
		os.Exit(1)
	}

	beatSvc := beatservice.NewBeatService(beatRepo, fileRepo, userClient, kafkaProducer)
	services := service.New(beatSvc, cfg)
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
