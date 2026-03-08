package authservice

import (
	"context"
	"log/slog"
	"time"

	"github.com/bns/pkg/apperrors"
	"github.com/bns/pkg/middleware"
	"github.com/golang-jwt/jwt/v5"
)

type UserCredentials struct {
	Email    string
	Password string
}

type RegisterInput struct {
	Name     string
	Email    string
	Phone    string
	Password string
	Role     string
}

type AuthRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type UserServiceClient interface {
	Register(ctx context.Context, in RegisterInput) (string, error) // returns userID
	VerifyCredentials(ctx context.Context, email, password string) (string, []string, error)
}

type AuthService struct {
	repo       AuthRepository
	userClient UserServiceClient
	jwtSecret  []byte
	tokenTTL   time.Duration
}

func NewAuthService(repo AuthRepository, userClient UserServiceClient, jwtSecret string, tokenTTL time.Duration) *AuthService {
	return &AuthService{
		repo:       repo,
		userClient: userClient,
		jwtSecret:  []byte(jwtSecret),
		tokenTTL:   tokenTTL,
	}
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (string, string, error) {
	slog.Info("registering new user", slog.String("email", in.Email))
	userID, err := s.userClient.Register(ctx, in)
	if err != nil {
		slog.Error("failed to register user", slog.String("email", in.Email), slog.String("error", err.Error()))
		return "", "", err
	}
	token, err := s.issueToken(ctx, userID, nil)
	if err != nil {
		slog.Error("failed to issue token for registered user", slog.String("userID", userID), slog.String("error", err.Error()))
		return "", "", err
	}
	slog.Info("user registered successfully", slog.String("userID", userID), slog.String("email", in.Email))
	return token, userID, nil
}

func (s *AuthService) Login(ctx context.Context, creds UserCredentials) (string, string, error) {
	slog.Info("user attempting login", slog.String("email", creds.Email))
	userID, roles, err := s.userClient.VerifyCredentials(ctx, creds.Email, creds.Password)
	if err != nil {
		slog.Warn("failed login attempt", slog.String("email", creds.Email), slog.String("error", err.Error()))
		return "", "", apperrors.ErrUnauthorized
	}
	token, err := s.issueToken(ctx, userID, roles)
	if err != nil {
		slog.Error("failed to issue token for login", slog.String("userID", userID), slog.String("error", err.Error()))
		return "", "", err
	}
	slog.Info("user logged in successfully", slog.String("userID", userID))
	return token, userID, nil
}

func (s *AuthService) Logout(ctx context.Context, userID string) error {
	return s.repo.Delete(ctx, userID)
}

func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, _ := claims["sub"].(string)
		storedToken, err := s.repo.Get(ctx, userID)
		if err != nil || storedToken != tokenString {
			return nil, jwt.ErrSignatureInvalid
		}
	}
	return token, nil
}

func (s *AuthService) issueToken(ctx context.Context, userID string, roles []string) (string, error) {
	claims := middleware.CustomClaims{
		Roles: roles,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}
	if err := s.repo.Set(ctx, userID, signed, s.tokenTTL); err != nil {
		return "", err
	}
	return signed, nil
}
