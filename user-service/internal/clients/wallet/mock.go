package wallet

import (
	"context"
	"log/slog"
)

type MockWalletClient struct{}

func NewMockClient() *MockWalletClient {
	return &MockWalletClient{}
}

func (c *MockWalletClient) CreateWallet(ctx context.Context, userID string) error {
	slog.Info("mock wallet client: CreateWallet called", slog.String("userID", userID))
	return nil
}

func (c *MockWalletClient) TopUp(ctx context.Context, userID string, amount float64) error {
	slog.Info("mock wallet client: TopUp called", slog.String("userID", userID), slog.Float64("amount", amount))
	return nil
}

func (c *MockWalletClient) GetBalance(ctx context.Context, userID string) (float64, error) {
	return 100.0, nil
}
