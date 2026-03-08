package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/bns/wallet-service/internal/models"
	"github.com/google/uuid"
)

type WalletRepository struct {
	db *sql.DB
}

func New(db *sql.DB) *WalletRepository {
	return &WalletRepository{
		db: db,
	}
}

func (r *WalletRepository) Init(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS wallets (
			id UUID PRIMARY KEY,
			user_id VARCHAR(255) UNIQUE NOT NULL,
			balance DECIMAL(20, 2) DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id UUID PRIMARY KEY,
			wallet_id UUID REFERENCES wallets(id),
			amount DECIMAL(20, 2) NOT NULL,
			type VARCHAR(50) NOT NULL,
			reference VARCHAR(255),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, q := range queries {
		if _, err := r.db.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return nil
}

func (r *WalletRepository) Create(ctx context.Context, wallet *models.Wallet) (string, error) {
	wallet.ID = uuid.New().String()
	wallet.CreatedAt = time.Now()
	wallet.UpdatedAt = time.Now()

	query := `INSERT INTO wallets (id, user_id, balance, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`
	_, err := r.db.ExecContext(ctx, query, wallet.ID, wallet.UserID, wallet.Balance, wallet.CreatedAt, wallet.UpdatedAt)
	if err != nil {
		return "", err
	}
	return wallet.ID, nil
}

func (r *WalletRepository) GetByUserID(ctx context.Context, userID string) (*models.Wallet, error) {
	query := `SELECT id, user_id, balance, created_at, updated_at FROM wallets WHERE user_id = $1`
	var w models.Wallet
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&w.ID, &w.UserID, &w.Balance, &w.CreatedAt, &w.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &w, err
}

func (r *WalletRepository) UpdateBalance(ctx context.Context, userID string, amount float64, txType string, ref string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update balance
	query := `UPDATE wallets SET balance = balance + $1, updated_at = $2 WHERE user_id = $3 RETURNING id`
	var walletID string
	err = tx.QueryRowContext(ctx, query, amount, time.Now(), userID).Scan(&walletID)
	if err != nil {
		return err
	}

	// 2. Log transaction
	txQuery := `INSERT INTO transactions (id, wallet_id, amount, type, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err = tx.ExecContext(ctx, txQuery, uuid.New().String(), walletID, amount, txType, ref, time.Now())
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *WalletRepository) GetTransactions(ctx context.Context, userID string) ([]*models.Transaction, error) {
	query := `SELECT t.id, t.wallet_id, t.amount, t.type, t.reference, t.created_at 
			  FROM transactions t 
			  JOIN wallets w ON t.wallet_id = w.id 
			  WHERE w.user_id = $1 
			  ORDER BY t.created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []*models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.WalletID, &t.Amount, &t.Type, &t.Reference, &t.CreatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, &t)
	}
	return txs, nil
}

