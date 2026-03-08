package redis

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

type AuthRepository struct {
	client *redis.Client
}

func New(client *redis.Client) *AuthRepository {
	return &AuthRepository{
		client: client,
	}
}

func (r *AuthRepository) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *AuthRepository) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

func (r *AuthRepository) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}
