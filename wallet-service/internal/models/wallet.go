package models

import "time"

type Wallet struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Balance   float64   `json:"balance" db:"balance"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type Transaction struct {
	ID        string    `json:"id" db:"id"`
	WalletID  string    `json:"wallet_id" db:"wallet_id"`
	Amount    float64   `json:"amount" db:"amount"`
	Type      string    `json:"type" db:"type"` // "credit", "debit"
	Reference string    `json:"reference" db:"reference"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
