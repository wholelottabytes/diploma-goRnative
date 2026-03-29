package models

import "time"

type Beat struct {
	ID           string    `json:"_id" bson:"_id"`
	Title        string    `json:"title" bson:"title"`
	Tags         []string  `json:"tags" bson:"tags"`
	BPM          int       `json:"bpm" bson:"bpm"`
	Price        float64   `json:"price" bson:"price"`
	Rating       float64   `json:"rating" bson:"rating"`
	Description  string    `json:"description" bson:"description"`
	DownloadURL  string    `json:"download_url" bson:"download_url"`
	AudioURL     string    `json:"audio_url" bson:"audio_url"`
	ImageURL     string    `json:"image_url" bson:"image_url"`
	Fingerprint  string    `json:"fingerprint,omitempty" bson:"fingerprint,omitempty"`
	FingerprintStatus string `json:"fingerprint_status,omitempty" bson:"fingerprint_status,omitempty"`
	AuthorID     string    `json:"author_id" bson:"author_id"`
	AuthorName   string    `json:"author_name" bson:"author_name"`
	AuthorAvatar string    `json:"author_avatar" bson:"author_avatar"`
	CreatedAt    time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" bson:"updated_at"`
}
