package models

import "time"

type Beat struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Price        float64   `json:"price"`
	Tags         []string  `json:"tags"`
	AudioURL     string    `json:"audio_url"`
	ImageURL     string    `json:"image_url"`
	AuthorID     string    `json:"author_id"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar string    `json:"author_avatar"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
