package seeder

import (
	"context"
	"log/slog"

	"github.com/bns/beat-service/internal/models"
	beatservice "github.com/bns/beat-service/internal/service/beat"
)

func SeedData(beatService *beatservice.BeatService, beatRepo beatservice.BeatRepository, userID string) {
	// Check if there are any beats in the database
	beats, err := beatRepo.FindAll(context.Background())
	if err != nil {
		slog.Error("failed to get beats for seeding check", "error", err)
		return
	}

	if len(beats) == 0 {
		slog.Info("no beats found, seeding sample beats")

		sampleBeats := []models.Beat{
			{
				Title:       "Chill Vibes",
				Genre:       "Lo-Fi",
				BPM:         80,
				Price:       15.00,
				AuthorID:    userID,
				AuthorName:  "Seeded Artist",
				ImageURL:    "https://example.com/images/chill.jpg",
				AudioURL:    "https://example.com/audio/chill.mp3",
				Rating:      4.5,
				DownloadURL: "https://example.com/downloads/chill.zip",
				Tags:        make([]string, 0),
			},
			{
				Title:       "Epic Trap Anthem",
				Genre:       "Trap",
				BPM:         140,
				Price:       25.00,
				AuthorID:    userID,
				AuthorName:  "Seeded Artist",
				ImageURL:    "https://example.com/images/trap.jpg",
				AudioURL:    "https://example.com/audio/trap.mp3",
				Rating:      4.8,
				DownloadURL: "https://example.com/downloads/trap.zip",
				Tags:        make([]string, 0),
			},
			{
				Title:       "Smooth R&B Groove",
				Genre:       "R&B",
				BPM:         95,
				Price:       20.00,
				AuthorID:    userID,
				AuthorName:  "Seeded Artist",
				ImageURL:    "https://example.com/images/rnb.jpg",
				AudioURL:    "https://example.com/audio/rnb.mp3",
				Rating:      4.2,
				DownloadURL: "https://example.com/downloads/rnb.zip",
				Tags:        make([]string, 0),
			},
		}

		for _, beatData := range sampleBeats {
			createdBeat, err := beatService.CreateBeat(context.Background(), &beatData)
			if err != nil {
				slog.Error("failed to seed beat", "title", beatData.Title, "error", err)
			} else {
				slog.Info("seeded beat successfully", "title", beatData.Title, "id", createdBeat.ID)
			}
		}
	} else {
		slog.Info("beats already exist, skipping seeding")
	}
}
