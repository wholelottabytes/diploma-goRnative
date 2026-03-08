package wallet

import (
	"context"
	"fmt"

	"github.com/bns/wallet-service/internal/models"
)

type WalletRepository interface {
	Create(ctx context.Context, wallet *models.Wallet) (string, error)
	GetByUserID(ctx context.Context, userID string) (*models.Wallet, error)
	UpdateBalance(ctx context.Context, userID string, amount float64, txType string, ref string) error
	GetTransactions(ctx context.Context, userID string) ([]*models.Transaction, error)
}

type WalletService struct {
	repo WalletRepository
}

func NewWalletService(repo WalletRepository) *WalletService {
	return &WalletService{
		repo: repo,
	}
}

func (s *WalletService) GetBalance(ctx context.Context, userID string) (float64, error) {
	w, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return 0, err
	}
	if w == nil {
		// Auto-create wallet if not exists
		_, err = s.repo.Create(ctx, &models.Wallet{UserID: userID, Balance: 0})
		if err != nil {
			return 0, err
		}
		return 0, nil
	}
	return w.Balance, nil
}

func (s *WalletService) TopUp(ctx context.Context, userID string, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	return s.repo.UpdateBalance(ctx, userID, amount, "credit", "topup")
}

func (s *WalletService) Debit(ctx context.Context, userID string, amount float64, ref string) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	w, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if w == nil || w.Balance < amount {
		return fmt.Errorf("insufficient funds")
	}
	return s.repo.UpdateBalance(ctx, userID, -amount, "debit", ref)
}

func (s *WalletService) Credit(ctx context.Context, userID string, amount float64, ref string) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	return s.repo.UpdateBalance(ctx, userID, amount, "credit", ref)
}

func (s *WalletService) ProcessPayment(ctx context.Context, fromUserID, toUserID string, amount float64) (bool, error) {
	if amount <= 0 {
		return false, fmt.Errorf("amount must be positive")
	}

	// 1. Debit the sender
	err := s.Debit(ctx, fromUserID, amount, "order_payment")
	if err != nil {
		return false, fmt.Errorf("debit failed: %w", err)
	}

	// 2. Credit the receiver
	err = s.Credit(ctx, toUserID, amount, "order_payment")
	if err != nil {
		// Rollback debit (simplified)
		_ = s.Credit(ctx, fromUserID, amount, "payment_rollback")
		return false, fmt.Errorf("credit failed: %w", err)
	}

	return true, nil
}

func (s *WalletService) GetTransactions(ctx context.Context, userID string) ([]*models.Transaction, error) {
	return s.repo.GetTransactions(ctx, userID)
}
