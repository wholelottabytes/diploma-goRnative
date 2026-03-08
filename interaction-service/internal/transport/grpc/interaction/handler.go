package interaction

import (
	"context"

	interactionv1 "github.com/bns/api/proto/interaction/v1"
	interactionservice "github.com/bns/interaction-service/internal/service/interaction"
	"google.golang.org/grpc"
)

type Handler struct {
	interactionv1.UnimplementedInteractionServiceServer
	interactionService *interactionservice.InteractionService
}

func NewHandler(interactionService *interactionservice.InteractionService) *Handler {
	return &Handler{
		interactionService: interactionService,
	}
}

func (h *Handler) Register(server *grpc.Server) {
	interactionv1.RegisterInteractionServiceServer(server, h)
}

func (h *Handler) CreateComment(ctx context.Context, req *interactionv1.CreateCommentRequest) (*interactionv1.CreateCommentResponse, error) {
	// Implementation for creating a comment
	return nil, nil
}

func (h *Handler) CreateRating(ctx context.Context, req *interactionv1.CreateRatingRequest) (*interactionv1.CreateRatingResponse, error) {
	// Implementation for creating a rating
	return nil, nil
}

func (h *Handler) GetCommentsByBeatID(ctx context.Context, req *interactionv1.GetCommentsByBeatIDRequest) (*interactionv1.GetCommentsByBeatIDResponse, error) {
	// Implementation for getting comments by beat ID
	return nil, nil
}

func (h *Handler) GetAverageRatingByBeatID(ctx context.Context, req *interactionv1.GetAverageRatingByBeatIDRequest) (*interactionv1.GetAverageRatingByBeatIDResponse, error) {
	// Implementation for getting average rating by beat ID
	return nil, nil
}
