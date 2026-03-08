package kafka

import (
	"context"
	"log/slog"

	"github.com/segmentio/kafka-go"
)

type ConsumerGroup struct {
	brokers []string
	groupID string
	reader  *kafka.Reader
}

func NewConsumerGroup(brokers []string, groupID string) *ConsumerGroup {
	return &ConsumerGroup{
		brokers: brokers,
		groupID: groupID,
	}
}

func (c *ConsumerGroup) Consume(ctx context.Context, topics []string, handler func(context.Context, string, []byte) error) {
	if c.reader == nil {
		c.reader = kafka.NewReader(kafka.ReaderConfig{
			Brokers:     c.brokers,
			GroupID:     c.groupID,
			GroupTopics: topics,
		})
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			m, err := c.reader.FetchMessage(ctx)
			if err != nil {
				slog.Error("failed to fetch message", slog.String("error", err.Error()))
				continue
			}

			if err := handler(ctx, m.Topic, m.Value); err != nil {
				slog.Error("failed to handle message", slog.String("error", err.Error()))
			}

			if err := c.reader.CommitMessages(ctx, m); err != nil {
				slog.Error("failed to commit message", slog.String("error", err.Error()))
			}
		}
	}
}

func (c *ConsumerGroup) Close() error {
	return c.reader.Close()
}
