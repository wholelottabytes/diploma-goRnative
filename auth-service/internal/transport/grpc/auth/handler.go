package auth

import (
	"context"

	authv1 "github.com/bns/api/proto/auth/v1"
	authservice "github.com/bns/auth-service/internal/service/auth"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
)

type Handler struct {
	authv1.UnimplementedAuthServiceServer
	authService *authservice.AuthService
}

func NewHandler(authService *authservice.AuthService) *Handler {
	return &Handler{
		authService: authService,
	}
}

func (h *Handler) Register(server *grpc.Server) {
	authv1.RegisterAuthServiceServer(server, h)
}

func (h *Handler) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	token, _, err := h.authService.Login(ctx, authservice.UserCredentials{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		return nil, err
	}

	return &authv1.LoginResponse{Token: token}, nil
}

func (h *Handler) ValidateToken(ctx context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	token, err := h.authService.ValidateToken(ctx, req.Token)
	if err != nil {
		return &authv1.ValidateTokenResponse{Valid: false}, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return &authv1.ValidateTokenResponse{Valid: false}, nil
	}

	roles := []string{}
	if aud, ok := claims["aud"].([]interface{}); ok {
		for _, v := range aud {
			roles = append(roles, v.(string))
		}
	}

	return &authv1.ValidateTokenResponse{
		Valid:  true,
		UserId: claims["sub"].(string),
		Roles:  roles,
	}, nil
}
