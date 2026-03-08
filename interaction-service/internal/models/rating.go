package models

import "time"

type Rating struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	BeatID    string    `json:"beat_id" bson:"beat_id"`
	UserID    string    `json:"user_id" bson:"user_id"`
	Value     int       `json:"value" bson:"value"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}
