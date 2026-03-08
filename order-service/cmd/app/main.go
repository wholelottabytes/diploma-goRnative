package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/bns/order-service/configs"
	"github.com/bns/order-service/internal/app"
	"github.com/bns/order-service/internal/repository/mongodb"
	"github.com/bns/order-service/internal/server"
	"github.com/bns/order-service/internal/service"
	orderservice "github.com/bns/order-service/internal/service/order"
	"github.com/bns/order-service/internal/transport/rest"
	"github.com/bns/pkg/kafka"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	beatv1 "github.com/bns/api/proto/beat/v1"
	walletv1 "github.com/bns/api/proto/wallet/v1"
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
	db := dbClient.Database(cfg.Mongo.Database)
	slog.Info("database connected")

	kafkaProducer := kafka.NewProducer(cfg.Kafka.Brokers, "order_events")
	defer func() {
		if err := kafkaProducer.Close(); err != nil {
			slog.Error("failed to close kafka producer", slog.String("error", err.Error()))
		}
	}()

	// gRPC Clients
	beatConn, err := grpc.Dial(cfg.Services.BeatServiceAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		slog.Error("failed to connect to beat service", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer beatConn.Close()
	beatClient := beatv1.NewBeatServiceClient(beatConn)

	walletConn, err := grpc.Dial(cfg.Services.WalletServiceAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		slog.Error("failed to connect to wallet service", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer walletConn.Close()
	walletClient := walletv1.NewWalletServiceClient(walletConn)

	orderRepo := mongodb.New(db)
	
	// Adapters for gRPC clients to match service interfaces
	beatAdapter := &beatClientAdapter{client: beatClient}
	walletAdapter := &walletClientAdapter{client: walletClient}

	orderSvc := orderservice.NewOrderService(orderRepo, kafkaProducer, beatAdapter, walletAdapter)
	services := service.New(orderSvc, cfg)
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

type beatClientAdapter struct {
	client beatv1.BeatServiceClient
}

func (a *beatClientAdapter) GetBeat(ctx context.Context, id string) (float64, string, error) {
	resp, err := a.client.GetBeat(ctx, &beatv1.GetBeatRequest{Id: id})
	if err != nil {
		return 0, "", err
	}
	if resp.Beat == nil {
		return 0, "", fmt.Errorf("beat not found")
	}
	return resp.Beat.Price, resp.Beat.AuthorId, nil
}

type walletClientAdapter struct {
	client walletv1.WalletServiceClient
}

func (a *walletClientAdapter) ProcessPayment(ctx context.Context, fromUserID, toUserID string, amount float64) (bool, error) {
	// Need a way to get wallet IDs from user IDs.
	// Either wallet-service provides GetWalletByUserID or we use user IDs as wallet IDs if possible,
	// or we update the proto to accept user IDs.
	// For now, assume processPayment handles user IDs or we have a mapping.
	// In my wallet service, I'll update ProcessPayment to take user IDs for convenience.
	resp, err := a.client.ProcessPayment(ctx, &walletv1.ProcessPaymentRequest{
		FromWalletId: fromUserID, // Using user ID as ID for simplicity in this flow
		ToWalletId:   toUserID,
		Amount:       amount,
	})
	if err != nil {
		return false, err
	}
	return resp.Success, nil
}
