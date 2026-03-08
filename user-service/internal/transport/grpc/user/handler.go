package user

import (
	"context"

	userv1 "github.com/bns/api/proto/user/v1"
	userservice "github.com/bns/user-service/internal/service/user"
	"google.golang.org/grpc"
)

type Handler struct {
	userv1.UnimplementedUserServiceServer
	userService *userservice.UserService
}

func NewHandler(userService *userservice.UserService) *Handler {
	return &Handler{
		userService: userService,
	}
}

func (h *Handler) RegisterWithServer(server *grpc.Server) {
	userv1.RegisterUserServiceServer(server, h)
}

func (h *Handler) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.RegisterResponse, error) {
	user, err := h.userService.Register(ctx, userservice.RegisterUserInput{
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Password: req.Password,
		Role:     req.Role,
	})
	if err != nil {
		return nil, err
	}
	return &userv1.RegisterResponse{
		UserId: user.ID,
	}, nil
}

func (h *Handler) VerifyCredentials(ctx context.Context, req *userv1.VerifyCredentialsRequest) (*userv1.VerifyCredentialsResponse, error) {
	userID, roles, err := h.userService.VerifyCredentials(ctx, req.Email, req.Password)
	if err != nil {
		return nil, err
	}
	return &userv1.VerifyCredentialsResponse{
		UserId: userID,
		Roles:  roles,
	}, nil
}

func (h *Handler) GetUserProfile(ctx context.Context, req *userv1.GetUserProfileRequest) (*userv1.GetUserProfileResponse, error) {
	user, err := h.userService.GetProfile(ctx, req.UserId)
	if err != nil {
		return nil, err
	}
	return &userv1.GetUserProfileResponse{
		UserId: user.ID,
		Name:   user.Name,
		Avatar: user.Avatar,
		Roles:  user.Roles,
	}, nil
}
