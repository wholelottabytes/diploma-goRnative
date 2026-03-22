package models

import "time"

type Beat struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Genre        string    `json:"genre"`
	BPM          int       `json:"bpm"`
	Price        float64   `json:"price"`
	Rating       float64   `json:"rating"`
	Description  string    `json:"description"`
	DownloadURL  string    `json:"download_url"`
	Tags         []string  `json:"tags"`
	AudioURL     string    `json:"audio_url"`
	ImageURL     string    `json:"image_url"`
	AuthorID     string    `json:"author_id"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar string    `json:"author_avatar"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
