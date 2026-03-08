package user

import (
	"context"

	"github.com/bns/pkg/apperrors"
)

type MockClient struct{}

func NewMockClient() *MockClient {
	return &MockClient{}
}

func (c *MockClient) VerifyCredentials(ctx context.Context, email, password string) (string, []string, error) {
	if email == "test@test.com" && password == "password" {
		return "user-id-123", []string{"user"}, nil
	}
	return "", nil, apperrors.ErrInvalidCredentials
}
