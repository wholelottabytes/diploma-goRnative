package analytics

import (
	"context"
)

type AnalyticsRepository interface {
	Save(ctx context.Context, eventType string, beatID, userID string, value float64) error
	GetBeatStats(ctx context.Context, beatID string) (views int64, sales int64, avgRating float64, err error)
}

type AnalyticsService struct {
	repo AnalyticsRepository
}

func NewAnalyticsService(repo AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{
		repo: repo,
	}
}

func (s *AnalyticsService) GetBeatStats(ctx context.Context, beatID string) (views int64, sales int64, avgRating float64, err error) {
	return s.repo.GetBeatStats(ctx, beatID)
}

func (s *AnalyticsService) LogEvent(ctx context.Context, eventType string, beatID, userID string, value float64) error {
	return s.repo.Save(ctx, eventType, beatID, userID, value)
}
