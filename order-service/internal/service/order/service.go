package order

import (
	"context"
	"fmt"
	"time"

	"github.com/bns/order-service/internal/models"
)

type OrderRepository interface {
	Create(ctx context.Context, order *models.Order) (string, error)
	GetByID(ctx context.Context, id string) (*models.Order, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.Order, error)
	HasPurchased(ctx context.Context, userID, beatID string) (bool, error)
}

type BeatClient interface {
	GetBeat(ctx context.Context, id string) (price float64, authorID string, err error)
}

type WalletClient interface {
	ProcessPayment(ctx context.Context, fromUserID, toUserID string, amount float64) (bool, error)
}

type Producer interface {
	Publish(ctx context.Context, key string, msg interface{}) error
}

type OrderService struct {
	repo         OrderRepository
	producer     Producer
	beatClient   BeatClient
	walletClient WalletClient
}

func NewOrderService(repo OrderRepository, producer Producer, beatClient BeatClient, walletClient WalletClient) *OrderService {
	return &OrderService{
		repo:         repo,
		producer:     producer,
		beatClient:   beatClient,
		walletClient: walletClient,
	}
}

func (s *OrderService) BuyBeat(ctx context.Context, userID, beatID string) (*models.Order, error) {
	// 1. Check if already purchased
	purchased, err := s.repo.HasPurchased(ctx, userID, beatID)
	if err != nil {
		return nil, err
	}
	if purchased {
		return nil, fmt.Errorf("beat already purchased")
	}

	// 2. Get beat info
	price, authorID, err := s.beatClient.GetBeat(ctx, beatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get beat info: %w", err)
	}

	// 3. Process payment
	// Note: In a real app, we need to handle seller's and platform's commission
	// For now, let's assume we transfer total price to seller (or platform)
	// Commission is 3%, so seller gets 97%, platform gets 3%.
	// Simplified: process 1 transfer of full price.
	success, err := s.walletClient.ProcessPayment(ctx, userID, authorID, price)
	if err != nil || !success {
		return nil, fmt.Errorf("payment failed: %w", err)
	}

	// 4. Create order
	commission := price * 0.03
	order := &models.Order{
		UserID:     userID,
		BeatID:     beatID,
		SellerID:   authorID,
		Price:      price,
		Commission: commission,
		Status:     "completed",
		CreatedAt:  time.Now(),
	}

	id, err := s.repo.Create(ctx, order)
	if err != nil {
		return nil, err
	}
	order.ID = id

	// 5. Publish event
	_ = s.producer.Publish(ctx, order.ID, map[string]interface{}{
		"type":     "order.created",
		"order_id": order.ID,
		"user_id":  order.UserID,
		"beat_id":  order.BeatID,
		"price":    order.Price,
		"ts":       order.CreatedAt,
	})

	return order, nil
}

func (s *OrderService) GetUserOrders(ctx context.Context, userID string) ([]*models.Order, error) {
	return s.repo.GetByUserID(ctx, userID)
}

func (s *OrderService) HasPurchased(ctx context.Context, userID, beatID string) (bool, error) {
	return s.repo.HasPurchased(ctx, userID, beatID)
}
