package userservice_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/bns/user-service/internal/models"
	userservice "github.com/bns/user-service/internal/service/user"
	"github.com/bns/user-service/internal/service/user/mocks"
)

// TestUserService_Register_Success tests successful user registration
func TestUserService_Register_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)

	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet, "test-secret")

	// Setup mocks
	mockRepo.EXPECT().FindByEmail(gomock.Any(), "test@example.com").Return(nil, nil)
	mockHasher.EXPECT().HashPassword("password123").Return("hashed_pwd", nil)
	mockRepo.EXPECT().Create(gomock.Any(), gomock.Any()).DoAndReturn(
		func(_ context.Context, user *models.User) (string, error) {
			user.CreatedAt = time.Now()
			user.UpdatedAt = time.Now()
			return "user-123", nil
		},
	)
	mockWallet.EXPECT().CreateWallet(gomock.Any(), "user-123").Return(nil)
	// Publish is called in a goroutine, use AnyTimes to avoid race condition
	mockProducer.EXPECT().Publish(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes().Return(nil)

	// Execute
	user, token, err := userService.Register(context.Background(), userservice.RegisterUserInput{
		Name:     "Test User",
		Email:    "test@example.com",
		Phone:    "+12345678901", // Valid phone
		Password: "password123",
		Role:     "user",
	})

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "test@example.com", user.Email)
	assert.NotEmpty(t, token)
}

// TestUserService_Register_DuplicateEmail tests duplicate email handling
func TestUserService_Register_DuplicateEmail(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)

	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet, "test-secret")

	// Setup mocks - user already exists
	existingUser := &models.User{
		ID:    "existing-id",
		Email: "test@example.com",
	}
	mockRepo.EXPECT().FindByEmail(gomock.Any(), "test@example.com").Return(existingUser, nil)

	// Execute
	user, token, err := userService.Register(context.Background(), userservice.RegisterUserInput{
		Name:     "Test User",
		Email:    "test@example.com",
		Phone:    "+12345678901",
		Password: "password123",
		Role:     "user",
	})

	// Assert
	assert.Error(t, err)
	assert.Nil(t, user)
	assert.Empty(t, token)
	assert.Contains(t, err.Error(), "already exists")
}

// TestUserService_Register_InvalidEmail tests invalid email validation
func TestUserService_Register_InvalidEmail(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)

	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet, "test-secret")

	// Execute with invalid email
	user, token, err := userService.Register(context.Background(), userservice.RegisterUserInput{
		Name:     "Test User",
		Email:    "invalid-email",
		Password: "password123",
		Role:     "user",
	})

	// Assert
	assert.Error(t, err)
	assert.Nil(t, user)
	assert.Empty(t, token)
}

// TestUserService_Register_InvalidRole tests invalid role validation
func TestUserService_Register_InvalidRole(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)

	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet, "test-secret")

	// Execute with invalid role (but valid phone to pass phone validation first)
	user, token, err := userService.Register(context.Background(), userservice.RegisterUserInput{
		Name:     "Test User",
		Email:    "test@example.com",
		Phone:    "+12345678901",
		Password: "password123",
		Role:     "invalid-role",
	})

	// Assert
	assert.Error(t, err)
	assert.Nil(t, user)
	assert.Empty(t, token)
	assert.Contains(t, err.Error(), "invalid role")
}

// TestUserService_Register_ShortPassword tests short password validation
func TestUserService_Register_ShortPassword(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)

	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet, "test-secret")

	// Execute with short password (but valid phone to pass phone validation first)
	user, token, err := userService.Register(context.Background(), userservice.RegisterUserInput{
		Name:     "Test User",
		Email:    "test@example.com",
		Phone:    "+12345678901",
		Password: "short", // Less than 8 chars
		Role:     "user",
	})

	// Assert
	assert.Error(t, err)
	assert.Nil(t, user)
	assert.Empty(t, token)
}
