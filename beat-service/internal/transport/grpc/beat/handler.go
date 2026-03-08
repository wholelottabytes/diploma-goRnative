package beat

import (
	"context"

	beatv1 "github.com/bns/api/proto/beat/v1"
	beatservice "github.com/bns/beat-service/internal/service/beat"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Handler struct {
	beatv1.UnimplementedBeatServiceServer
	beatService *beatservice.BeatService
}

func NewHandler(beatService *beatservice.BeatService) *Handler {
	return &Handler{
		beatService: beatService,
	}
}

func (h *Handler) Register(server *grpc.Server) {
	beatv1.RegisterBeatServiceServer(server, h)
}

func (h *Handler) CreateBeat(ctx context.Context, req *beatv1.CreateBeatRequest) (*beatv1.CreateBeatResponse, error) {
	// Implementation for creating a beat
	return nil, nil
}

func (h *Handler) GetBeat(ctx context.Context, req *beatv1.GetBeatRequest) (*beatv1.GetBeatResponse, error) {
	beat, err := h.beatService.GetBeat(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	if beat == nil {
		return &beatv1.GetBeatResponse{}, nil
	}

	return &beatv1.GetBeatResponse{
		Beat: &beatv1.Beat{
			Id:        beat.ID,
			Title:     beat.Title,
			Price:     beat.Price,
			Tags:      beat.Tags,
			AudioUrl:  beat.AudioURL,
			ImageUrl:  beat.ImageURL,
			AuthorId:  beat.AuthorID,
			CreatedAt: timestamppb.New(beat.CreatedAt),
			UpdatedAt: timestamppb.New(beat.UpdatedAt),
		},
	}, nil
}

func (h *Handler) SearchBeats(ctx context.Context, req *beatv1.SearchBeatsRequest) (*beatv1.SearchBeatsResponse, error) {
	// Implementation for searching beats
	return nil, nil
}
