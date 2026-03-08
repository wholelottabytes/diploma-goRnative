package kafka

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/bns/analytics-service/internal/service"
	pkgkafka "github.com/bns/pkg/kafka"
)

type Event struct {
	Type   string  `json:"type"`
	BeatID string  `json:"beat_id"`
	UserID string  `json:"user_id"`
	Value  float64 `json:"value"`
	Price  float64 `json:"price"` // For order.created
}

type EventConsumer struct {
	services *service.Services
	consumer *pkgkafka.ConsumerGroup
	topics   []string
}

func NewEventConsumer(services *service.Services, consumer *pkgkafka.ConsumerGroup, topics []string) *EventConsumer {
	return &EventConsumer{
		services: services,
		consumer: consumer,
		topics:   topics,
	}
}

func (c *EventConsumer) Run(ctx context.Context) {
	slog.Info("starting analytics consumer", slog.Any("topics", c.topics))
	c.consumer.Consume(ctx, c.topics, c.handleMessage)
}

func (c *EventConsumer) Close() error {
	return c.consumer.Close()
}

func (c *EventConsumer) handleMessage(ctx context.Context, topic string, message []byte) error {
	var event Event
	if err := json.Unmarshal(message, &event); err != nil {
		slog.Error("failed to unmarshal event", slog.String("error", err.Error()), slog.String("topic", topic))
		return nil // Skip invalid messages
	}

	// Normalize value
	val := event.Value
	if event.Type == "" {
		event.Type = topic // Fallback to topic name if type not in JSON
	}
	if event.Type == "order.created" {
		val = event.Price
	}

	return c.services.Analytics.LogEvent(ctx, event.Type, event.BeatID, event.UserID, val)
}
