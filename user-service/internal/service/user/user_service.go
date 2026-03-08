package userservice

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	eventsv1 "github.com/bns/api/proto/events/v1"
	"github.com/bns/pkg/apperrors"
	"github.com/bns/pkg/hash"
	"github.com/bns/pkg/validate"
	"github.com/bns/user-service/internal/models"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) (string, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id string) error
}

type RegisterUserInput struct {
	Name     string
	Email    string
	Phone    string
	Password string
	Role     string
}

type Producer interface {
	Publish(ctx context.Context, key string, message interface{}) error
}

type WalletService interface {
	CreateWallet(ctx context.Context, userID string) error
	TopUp(ctx context.Context, userID string, amount float64) error
	GetBalance(ctx context.Context, userID string) (float64, error)
}

type UserService struct {
	repo          UserRepository
	hasher        hash.Hasher
	producer      Producer
	walletService WalletService
}

func NewUserService(repo UserRepository, hasher hash.Hasher, producer Producer, walletService WalletService) *UserService {
	return &UserService{
		repo:          repo,
		hasher:        hasher,
		producer:      producer,
		walletService: walletService,
	}
}

func (s *UserService) Register(ctx context.Context, input RegisterUserInput) (*models.User, error) {
	slog.Info("processing user registration", slog.String("email", input.Email))
	input.Email = strings.ToLower(input.Email)

	if err := validate.ValidateCredentials(input.Email, input.Phone, input.Password); err != nil {
		slog.Warn("user registration validation failed", slog.String("email", input.Email), slog.String("error", err.Error()))
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if input.Role != "user" && input.Role != "admin" {
		return nil, apperrors.ErrInvalidRole
	}

	existing, err := s.repo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, apperrors.ErrUserExists
	}

	passwordHash, err := s.hasher.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:         input.Name,
		Email:        input.Email,
		Phone:        input.Phone,
		PasswordHash: passwordHash,
		Roles:        []string{input.Role},
		Rating:       5.0,
	}

	userID, err := s.repo.Create(ctx, user)
	if err != nil {
		slog.Error("failed to create user in repository", slog.String("email", user.Email), slog.String("error", err.Error()))
		return nil, err
	}
	user.ID = userID

	if err := s.walletService.CreateWallet(ctx, user.ID); err != nil {
		slog.Error("failed to create wallet for user", slog.String("error", err.Error()), slog.String("userID", user.ID))
		return nil, apperrors.ErrWalletCreation
	}

	slog.Info("user created successfully, publishing event", slog.String("userID", user.ID))
	go func() {
		var role string
		if len(user.Roles) > 0 {
			role = user.Roles[0]
		}

		event := &eventsv1.UserRegisteredEvent{
			UserId:       user.ID,
			Name:         user.Name,
			Email:        user.Email,
			Role:         role,
			RegisteredAt: timestamppb.New(user.CreatedAt),
		}
		if err := s.producer.Publish(context.Background(), user.ID, event); err != nil {
			slog.Error("failed to publish user_registered event", slog.String("error", err.Error()), slog.String("userID", user.ID))
		} else {
			slog.Info("published user_registered event", slog.String("userID", user.ID))
		}
	}()

	return user, nil
}

func (s *UserService) VerifyCredentials(ctx context.Context, email, password string) (string, []string, error) {
	email = strings.ToLower(email)

	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return "", nil, err
	}
	if user == nil {
		return "", nil, apperrors.ErrInvalidCredentials
	}

	if !s.hasher.CheckPasswordHash(password, user.PasswordHash) {
		return "", nil, apperrors.ErrInvalidCredentials
	}

	return user.ID, user.Roles, nil
}

func (s *UserService) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	user, err := s.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user.Roles, nil
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, apperrors.ErrUserNotFound
	}
	return user, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID, name, phone, email string) (*models.User, error) {
	user, err := s.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	normalizedEmail := strings.ToLower(email)
	if user.Email != normalizedEmail {
		existing, err := s.repo.FindByEmail(ctx, normalizedEmail)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, apperrors.ErrUserExists
		}
		user.Email = normalizedEmail
	}

	user.Name = name
	user.Phone = phone
	user.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
func (s *UserService) DeleteProfile(ctx context.Context, userID string) error {
	_, err := s.GetProfile(ctx, userID)
	if err != nil {
		return err
	}

	return s.repo.Delete(ctx, userID)
}

func (s *UserService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	user, err := s.GetProfile(ctx, userID)
	if err != nil {
		return err
	}

	if !s.hasher.CheckPasswordHash(oldPassword, user.PasswordHash) {
		return apperrors.ErrInvalidCredentials
	}

	newPasswordHash, err := s.hasher.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = newPasswordHash
	user.UpdatedAt = time.Now()

	return s.repo.Update(ctx, user)
}

func (s *UserService) AssignRole(ctx context.Context, userID, role string) error {
	if role != "admin" {
		return apperrors.ErrRoleCannotBeAssigned
	}

	user, err := s.GetProfile(ctx, userID)
	if err != nil {
		return err
	}

	for _, r := range user.Roles {
		if r == role {
			return nil
		}
	}

	user.Roles = append(user.Roles, role)
	user.UpdatedAt = time.Now()

	return s.repo.Update(ctx, user)
}

func (s *UserService) UpdateRating(ctx context.Context, userID string, newRating float64) error {
	user, err := s.GetProfile(ctx, userID)
	if err != nil {
		return err
	}

	user.Rating = newRating
	user.UpdatedAt = time.Now()

	return s.repo.Update(ctx, user)
}

func (s *UserService) TopUpBalance(ctx context.Context, userID string, amount float64) error {
	if amount <= 0 {
		return apperrors.ErrDataConversion
	}
	return s.walletService.TopUp(ctx, userID, amount)
}

func (s *UserService) GetBalance(ctx context.Context, userID string) (float64, error) {
	return s.walletService.GetBalance(ctx, userID)
}
