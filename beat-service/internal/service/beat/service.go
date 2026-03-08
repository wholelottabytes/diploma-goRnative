package beat

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/bns/beat-service/internal/models"
	userv1 "github.com/bns/api/proto/user/v1"
	"github.com/google/uuid"
)

const (
	ImagesBucket = "beat-images"
	AudioBucket  = "beat-audio"
)

type UserClient interface {
	GetUserProfile(ctx context.Context, userID string) (*userv1.GetUserProfileResponse, error)
}

type BeatRepository interface {
	Create(ctx context.Context, beat *models.Beat) (string, error)
	FindByID(ctx context.Context, id string) (*models.Beat, error)
	FindByIDs(ctx context.Context, ids []string) ([]*models.Beat, error)
	Search(ctx context.Context, query string) ([]*models.Beat, error)
	Update(ctx context.Context, id string, beat *models.Beat) error
	Delete(ctx context.Context, id string) error
}

type FileRepository interface {
	Upload(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64) (string, error)
	Delete(ctx context.Context, bucketName, objectName string) error
	GetURL(ctx context.Context, bucketName, objectName string) (string, error)
}

type Producer interface {
	Publish(ctx context.Context, key string, msg interface{}) error
}

type BeatService struct {
	beatRepo   BeatRepository
	fileRepo   FileRepository
	userClient UserClient
	producer   Producer
}

func NewBeatService(beatRepo BeatRepository, fileRepo FileRepository, userClient UserClient, producer Producer) *BeatService {
	return &BeatService{
		beatRepo:   beatRepo,
		fileRepo:   fileRepo,
		userClient: userClient,
		producer:   producer,
	}
}

func (s *BeatService) CreateBeat(ctx context.Context, beat *models.Beat) (*models.Beat, error) {
	beat.ID = uuid.New().String()
	beat.CreatedAt = time.Now()
	beat.UpdatedAt = time.Now()

	id, err := s.beatRepo.Create(ctx, beat)
	if err != nil {
		return nil, err
	}
	beat.ID = id

	// Publish event
	_ = s.producer.Publish(ctx, beat.ID, map[string]interface{}{
		"type":    "beat.created",
		"beat_id": beat.ID,
		"user_id": beat.AuthorID,
		"price":   beat.Price,
		"ts":      beat.CreatedAt,
	})

	return beat, nil
}

func (s *BeatService) GetBeat(ctx context.Context, id string) (*models.Beat, error) {
	beat, err := s.beatRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if beat == nil {
		return nil, nil
	}

	s.enrichBeats(ctx, []*models.Beat{beat})
	return beat, nil
}

func (s *BeatService) SearchBeats(ctx context.Context, query string) ([]*models.Beat, error) {
	beats, err := s.beatRepo.Search(ctx, query)
	if err != nil {
		return nil, err
	}

	s.enrichBeats(ctx, beats)
	return beats, nil
}

func (s *BeatService) UpdateBeat(ctx context.Context, id string, userID string, data *models.Beat) (*models.Beat, error) {
	existing, err := s.beatRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil // Error not found
	}
	if existing.AuthorID != userID {
		return nil, nil // Error forbidden
	}

	data.UpdatedAt = time.Now()
	err = s.beatRepo.Update(ctx, id, data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (s *BeatService) DeleteBeat(ctx context.Context, id string, userID string) error {
	existing, err := s.beatRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return nil // Not found
	}
	if existing.AuthorID != userID {
		return nil // Forbidden
	}

	// Delete from ES
	err = s.beatRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	// Delete from MinIO
	if existing.ImageURL != "" {
		_ = s.fileRepo.Delete(ctx, ImagesBucket, existing.ImageURL)
	}
	if existing.AudioURL != "" {
		_ = s.fileRepo.Delete(ctx, AudioBucket, existing.AudioURL)
	}

	return nil
}

func (s *BeatService) ListBeats(ctx context.Context) ([]*models.Beat, error) {
	// For simplicity, reusing search with empty query
	return s.SearchBeats(ctx, "")
}

func (s *BeatService) GetMyBeats(ctx context.Context, userID string) ([]*models.Beat, error) {
	all, err := s.ListBeats(ctx)
	if err != nil {
		return nil, err
	}
	var myBeats []*models.Beat
	for _, b := range all {
		if b.AuthorID == userID {
			myBeats = append(myBeats, b)
		}
	}
	return myBeats, nil
}

func (s *BeatService) GetRecentBeats(ctx context.Context) ([]*models.Beat, error) {
	// For now just sort all by created_at in memory or limit ES search
	return s.SearchBeats(ctx, "")
}

func (s *BeatService) GetPopularBeats(ctx context.Context) ([]*models.Beat, error) {
	// Placeholder for popularity logic
	return s.SearchBeats(ctx, "")
}

func (s *BeatService) UploadFile(ctx context.Context, bucket string, reader io.Reader, size int64, extension string) (string, error) {
	objectName := fmt.Sprintf("%s%s", uuid.New().String(), extension)
	return s.fileRepo.Upload(ctx, bucket, objectName, reader, size)
}

func (s *BeatService) GetByIDs(ctx context.Context, ids []string) ([]*models.Beat, error) {
	beats, err := s.beatRepo.FindByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}

	s.enrichBeats(ctx, beats)
	return beats, nil
}

func (s *BeatService) enrichBeats(ctx context.Context, beats []*models.Beat) {
	// Cache for user profiles to avoid redundant gRPC calls in the same request
	profileCache := make(map[string]*userv1.GetUserProfileResponse)

	for _, b := range beats {
		// URLs
		if b.ImageURL != "" {
			url, _ := s.fileRepo.GetURL(ctx, ImagesBucket, b.ImageURL)
			b.ImageURL = url
		}
		if b.AudioURL != "" {
			url, _ := s.fileRepo.GetURL(ctx, AudioBucket, b.AudioURL)
			b.AudioURL = url
		}

		// Author Info
		if b.AuthorID != "" {
			profile, ok := profileCache[b.AuthorID]
			if !ok {
				resp, err := s.userClient.GetUserProfile(ctx, b.AuthorID)
				if err == nil {
					profile = resp
					profileCache[b.AuthorID] = resp
				}
			}

			if profile != nil {
				b.AuthorName = profile.Name
				b.AuthorAvatar = profile.Avatar
			}
		}
	}
}
