package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bns/auth-service/configs"
	"github.com/bns/auth-service/internal/app"
	"github.com/bns/auth-service/internal/clients/user"
	"github.com/bns/auth-service/internal/repository/redis"
	"github.com/bns/auth-service/internal/server"
	"github.com/bns/auth-service/internal/service"
	authservice "github.com/bns/auth-service/internal/service/auth"
	"github.com/bns/auth-service/internal/transport/rest"
	go_redis "github.com/go-redis/redis/v8"
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

	redisClient := go_redis.NewClient(&go_redis.Options{
		Addr: cfg.Redis.Addr,
	})

	if _, err := redisClient.Ping(ctx).Result(); err != nil {
		slog.Error("failed to connect to redis", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("redis connected")

	authRepo := redis.New(redisClient)
	
	userServiceAddr := os.Getenv("USER_SERVICE_ADDR")
	if userServiceAddr == "" {
		userServiceAddr = "localhost:9090" // default matching docker-compose
	}
	userClient, err := user.NewClient(userServiceAddr)
	if err != nil {
		slog.Error("failed to connect to user-service", slog.String("error", err.Error()))
		os.Exit(1)
	}
	
	authSvc := authservice.NewAuthService(authRepo, userClient, "super-secret", time.Hour*24)
	services := service.New(authSvc)
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

