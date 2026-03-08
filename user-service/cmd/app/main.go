package main

import (
	"context"
	"log/slog"
	"net/url"
	"os"
	"os/signal"
	"syscall"

	"github.com/bns/pkg/hash"
	"github.com/bns/pkg/kafka"
	"github.com/bns/pkg/logger"
	"github.com/bns/user-service/configs"
	"github.com/bns/user-service/internal/app"
	"github.com/bns/user-service/internal/clients/wallet"
	"github.com/bns/user-service/internal/repository/mongodb"
	"github.com/bns/user-service/internal/server"
	"github.com/bns/user-service/internal/service"
	userservice "github.com/bns/user-service/internal/service/user"
	transport_kafka "github.com/bns/user-service/internal/transport/kafka"
	"github.com/bns/user-service/internal/transport/rest"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mongodb"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	parsedURL, err := url.Parse(cfg.Mongo.URI)
	if err != nil {
		slog.Error("failed to parse mongo uri", "error", err)
		os.Exit(1)
	}
	parsedURL.Path = "/" + cfg.Mongo.Database
	migrationURI := parsedURL.String()

	m, err := migrate.New("file://./migrations", migrationURI)
	if err != nil {
		slog.Error("failed to create migrate instance", slog.String("error", err.Error()))
		os.Exit(1)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		slog.Error("failed to apply migrations", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("database migrations applied")

	kafkaProducer := kafka.NewProducer(cfg.Kafka.Brokers, "user_events")
	defer func() {
		if err := kafkaProducer.Close(); err != nil {
			slog.Error("failed to close kafka producer", slog.String("error", err.Error()))
		}
	}()
	slog.Info("kafka producer initialized")

	ratingConsumerGroup := kafka.NewConsumerGroup(cfg.Kafka.Brokers, cfg.Kafka.RatingGroupID)
	
	repoAggregator := mongodb.New(db)

	walletMock := wallet.NewMockClient()

	hasher := hash.NewBcryptHasher()
	userService := userservice.NewUserService(repoAggregator.UserRepository, hasher, kafkaProducer, walletMock)
	serviceAggregator := service.New(userService, cfg)

	restHandler := rest.NewHandler(serviceAggregator)
	ratingConsumer := transport_kafka.NewRatingUpdateConsumer(userService, ratingConsumerGroup, cfg.Kafka.RatingTopic)
	slog.Info("dependencies initialized")

	mainServer := server.New(cfg, serviceAggregator, restHandler)
	application := app.New(mainServer, ratingConsumer)

	if err := application.Run(ctx); err != nil {
		slog.Error("app run error", slog.String("error", err.Error()))
		stop()
		os.Exit(1)
	}

	slog.Info("app stopped gracefully")
}
