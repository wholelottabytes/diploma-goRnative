package kafka

import (
	"context"

	userservice "github.com/bns/user-service/internal/service/user"
	"github.com/bns/pkg/kafka"
)

type RatingUpdateConsumer struct {
	userService *userservice.UserService
	consumer    *kafka.ConsumerGroup
	topic       string
}

func NewRatingUpdateConsumer(userService *userservice.UserService, consumer *kafka.ConsumerGroup, topic string) *RatingUpdateConsumer {
	return &RatingUpdateConsumer{
		userService: userService,
		consumer:    consumer,
		topic:       topic,
	}
}

func (c *RatingUpdateConsumer) Run(ctx context.Context) {
	c.consumer.Consume(ctx, []string{c.topic}, c.handleMessage)
}

func (c *RatingUpdateConsumer) Close() error {
	return c.consumer.Close()
}

func (c *RatingUpdateConsumer) handleMessage(ctx context.Context, topic string, message []byte) error {
	// Implementation for handling rating update messages
	return nil
}
