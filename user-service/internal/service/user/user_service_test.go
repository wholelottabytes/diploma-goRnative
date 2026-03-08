package userservice_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/bns/pkg/apperrors"
	"github.com/bns/user-service/internal/models"
	userservice "github.com/bns/user-service/internal/service/user"
	"github.com/bns/user-service/internal/service/user/mocks"
)

func TestUserService_Register(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockRepo := mocks.NewMockUserRepository(ctrl)
	mockHasher := mocks.NewMockHasher(ctrl)
	mockProducer := mocks.NewMockProducer(ctrl)
	mockWallet := mocks.NewMockWalletService(ctrl)
	userService := userservice.NewUserService(mockRepo, mockHasher, mockProducer, mockWallet)
	publishCalled := make(chan bool, 1)

	testCases := []struct {
		name          string
		input         userservice.RegisterUserInput
		setupMocks    func()
		expectedUser  *models.User
		expectedError error
		waitForGo     bool
	}{
		{
			name: "Successful Registration",
			input: userservice.RegisterUserInput{
				Name:     "Test User",
				Email:    "test@example.com",
				Phone:    "+1234567890",
				Password: "password123",
				Role:     "User",
			},
			setupMocks: func() {
				mockRepo.EXPECT().FindByEmail(gomock.Any(), "test@example.com").Return(nil, nil)
				mockHasher.EXPECT().HashPassword("password123").Return("hashed_password", nil)
				mockRepo.EXPECT().Create(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, user *models.User) (string, error) {
					user.CreatedAt = time.Now()
					user.UpdatedAt = time.Now()
					return "new_user_id", nil
				})
				mockWallet.EXPECT().CreateWallet(gomock.Any(), "new_user_id").Return(nil)
				mockProducer.EXPECT().Publish(gomock.Any(), "new_user_id", gomock.Any()).DoAndReturn(func(ctx context.Context, key string, msg interface{}) error {
					publishCalled <- true
					return nil
				})
			},
			expectedUser: &models.User{
				ID: "new_user_id",
			},
			expectedError: nil,
			waitForGo:     true,
		},
		{
			name: "User Already Exists",
			input: userservice.RegisterUserInput{
				Email:    "existing@example.com",
				Role:     "User",
				Password: "password123",
				Phone:    "+1234567890",
			},
			setupMocks: func() {
				mockRepo.EXPECT().FindByEmail(gomock.Any(), "existing@example.com").Return(&models.User{}, nil)
			},
			expectedUser:  nil,
			expectedError: apperrors.ErrUserExists,
		},
		{
			name: "Invalid Role",
			input: userservice.RegisterUserInput{
				Email:    "test@example.com",
				Role:     "Admin",
				Password: "password123",
				Phone:    "+1234567890",
			},
			setupMocks:    func() {},
			expectedUser:  nil,
			expectedError: apperrors.ErrInvalidRole,
		},
		{
			name: "Password Hashing Fails",
			input: userservice.RegisterUserInput{
				Email:    "test@example.com",
				Password: "password123",
				Role:     "User",
				Phone:    "+1234567890",
			},
			setupMocks: func() {
				mockRepo.EXPECT().FindByEmail(gomock.Any(), "test@example.com").Return(nil, nil)
				mockHasher.EXPECT().HashPassword("password123").Return("", errors.New("hash error"))
			},
			expectedUser:  nil,
			expectedError: errors.New("hash error"),
		},
		{
			name: "Wallet Creation Fails",
			input: userservice.RegisterUserInput{
				Email:    "test@example.com",
				Password: "password123",
				Role:     "User",
				Phone:    "+1234567890",
			},
			setupMocks: func() {
				mockRepo.EXPECT().FindByEmail(gomock.Any(), "test@example.com").Return(nil, nil)
				mockHasher.EXPECT().HashPassword("password123").Return("hashed_password", nil)
				mockRepo.EXPECT().Create(gomock.Any(), gomock.Any()).Return("new_user_id", nil)
				mockWallet.EXPECT().CreateWallet(gomock.Any(), "new_user_id").Return(errors.New("wallet error"))
			},
			expectedUser:  nil,
			expectedError: apperrors.ErrWalletCreation,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			tc.setupMocks()
			user, err := userService.Register(context.Background(), tc.input)
			if tc.waitForGo {
				select {
				case <-publishCalled:
				case <-time.After(1 * time.Second):

					t.Fatal("timed out waiting for producer.Publish to be called")
				}
			}
			if tc.expectedError != nil {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedError.Error())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedUser.ID, user.ID)
				assert.NotZero(t, user.CreatedAt)
				assert.NotZero(t, user.UpdatedAt)
			}
		})
	}
}
