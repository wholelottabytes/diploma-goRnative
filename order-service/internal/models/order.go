package models

import "time"

type Order struct {
	ID         string    `json:"id" bson:"_id,omitempty"`
	UserID     string    `json:"user_id" bson:"user_id"`
	BeatID     string    `json:"beat_id" bson:"beat_id"`
	SellerID   string    `json:"seller_id" bson:"seller_id"`
	Price      float64   `json:"price" bson:"price"`
	Commission float64   `json:"commission" bson:"commission"`
	Status     string    `json:"status" bson:"status"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
}
