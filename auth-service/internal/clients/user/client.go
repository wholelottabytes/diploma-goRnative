package user

import (
	"context"

	authservice "github.com/bns/auth-service/internal/service/auth"
	userv1 "github.com/bns/api/proto/user/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	grpcClient userv1.UserServiceClient
}

func NewClient(addr string) (*Client, error) {
	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &Client{grpcClient: userv1.NewUserServiceClient(conn)}, nil
}

func (c *Client) Register(ctx context.Context, in authservice.RegisterInput) (string, error) {
	resp, err := c.grpcClient.Register(ctx, &userv1.RegisterRequest{
		Name:     in.Name,
		Email:    in.Email,
		Phone:    in.Phone,
		Password: in.Password,
		Role:     in.Role,
	})
	if err != nil {
		return "", err
	}
	return resp.UserId, nil
}

func (c *Client) VerifyCredentials(ctx context.Context, email, password string) (string, []string, error) {
	resp, err := c.grpcClient.VerifyCredentials(ctx, &userv1.VerifyCredentialsRequest{
		Email:    email,
		Password: password,
	})
	if err != nil {
		return "", nil, err
	}
	return resp.UserId, resp.Roles, nil
}
