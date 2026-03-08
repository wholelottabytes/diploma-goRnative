package interaction

import (
	"context"
	"time"

	"github.com/bns/interaction-service/internal/models"
)

type InteractionRepository interface {
	CreateComment(ctx context.Context, comment *models.Comment) (string, error)
	UpsertRating(ctx context.Context, rating *models.Rating) error
	GetUserRating(ctx context.Context, beatID, userID string) (*models.Rating, error)
	GetCommentsByBeatID(ctx context.Context, beatID string, page, limit int64) ([]*models.Comment, error)
	GetAverageRatingByBeatID(ctx context.Context, beatID string) (float64, int64, error)
	UpdateComment(ctx context.Context, id, userID, text string) error
	DeleteComment(ctx context.Context, id, userID string) error
	GetLikedBeatIDs(ctx context.Context, userID string) ([]string, error)
}

type Producer interface {
	Publish(ctx context.Context, key string, msg interface{}) error
}

type InteractionService struct {
	repo     InteractionRepository
	producer Producer
}

func NewInteractionService(repo InteractionRepository, producer Producer) *InteractionService {
	return &InteractionService{
		repo:     repo,
		producer: producer,
	}
}

func (s *InteractionService) RateBeat(ctx context.Context, beatID, userID string, value int) error {
	rating := &models.Rating{
		BeatID:    beatID,
		UserID:    userID,
		Value:     value,
		CreatedAt: time.Now(),
	}

	err := s.repo.UpsertRating(ctx, rating)
	if err != nil {
		return err
	}

	// Publish event
	_ = s.producer.Publish(ctx, beatID, map[string]interface{}{
		"type":    "beat.rated",
		"beat_id": beatID,
		"user_id": userID,
		"value":   value,
		"ts":      rating.CreatedAt,
	})

	return nil
}

func (s *InteractionService) GetRating(ctx context.Context, beatID string) (float64, int64, error) {
	return s.repo.GetAverageRatingByBeatID(ctx, beatID)
}

func (s *InteractionService) GetUserRating(ctx context.Context, beatID, userID string) (*models.Rating, error) {
	return s.repo.GetUserRating(ctx, beatID, userID)
}

func (s *InteractionService) AddComment(ctx context.Context, beatID, userID, text string) (string, error) {
	comment := &models.Comment{
		BeatID:    beatID,
		UserID:    userID,
		Text:      text,
		CreatedAt: time.Now(),
	}

	id, err := s.repo.CreateComment(ctx, comment)
	if err != nil {
		return "", err
	}

	// Publish event
	_ = s.producer.Publish(ctx, beatID, map[string]interface{}{
		"type":    "beat.commented",
		"beat_id": beatID,
		"user_id": userID,
		"text":    text,
		"ts":      comment.CreatedAt,
	})

	return id, nil
}

func (s *InteractionService) GetComments(ctx context.Context, beatID string, page, limit int64) ([]*models.Comment, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	return s.repo.GetCommentsByBeatID(ctx, beatID, page, limit)
}

func (s *InteractionService) UpdateComment(ctx context.Context, id, userID, text string) error {
	return s.repo.UpdateComment(ctx, id, userID, text)
}

func (s *InteractionService) DeleteComment(ctx context.Context, id, userID string) error {
	return s.repo.DeleteComment(ctx, id, userID)
}

func (s *InteractionService) GetLikedBeatIDs(ctx context.Context, userID string) ([]string, error) {
	return s.repo.GetLikedBeatIDs(ctx, userID)
}
