package models

import "time"

type Comment struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	BeatID    string    `json:"beat_id" bson:"beat_id"`
	UserID    string    `json:"user_id" bson:"user_id"`
	Text      string    `json:"text" bson:"text"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}
