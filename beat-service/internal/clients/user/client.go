package user

import (
	"context"

	userv1 "github.com/bns/api/proto/user/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	client userv1.UserServiceClient
}

func NewClient(addr string) (*Client, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	return &Client{
		client: userv1.NewUserServiceClient(conn),
	}, nil
}

func (c *Client) GetUserProfile(ctx context.Context, userID string) (*userv1.GetUserProfileResponse, error) {
	return c.client.GetUserProfile(ctx, &userv1.GetUserProfileRequest{
		UserId: userID,
	})
}
