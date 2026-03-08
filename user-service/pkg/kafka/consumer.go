package kafka

import (
	"context"
	"log/slog"
	"time"

	"github.com/segmentio/kafka-go"
)

type ConsumerGroup struct {
	reader *kafka.Reader
}

func NewConsumerGroup(brokers []string, topic, groupID string, commitInterval time.Duration) *ConsumerGroup {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		GroupID:        groupID,
		Topic:          topic,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: commitInterval,
	})
	return &ConsumerGroup{reader: reader}
}

func (cg *ConsumerGroup) Consume(ctx context.Context, handler func(context.Context, kafka.Message) error) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				slog.Info("Stopping kafka consumer group")
				return
			default:
				m, err := cg.reader.FetchMessage(ctx)
				if err != nil {
					slog.Error("failed to fetch message from kafka", slog.String("error", err.Error()))
					continue
				}

				if err := handler(ctx, m); err != nil {
					slog.Error("failed to handle kafka message", slog.String("error", err.Error()))
				} else {
					if err := cg.reader.CommitMessages(ctx, m); err != nil {
						slog.Error("failed to commit kafka message", slog.String("error", err.Error()))
					}
				}
			}
		}
	}()
}

func (cg *ConsumerGroup) Close() error {
	return cg.reader.Close()
}
