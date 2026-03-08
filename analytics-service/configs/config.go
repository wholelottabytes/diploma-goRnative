package configs

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	App        AppConfig
	HTTP       HTTPConfig
	ClickHouse ClickHouseConfig
	Kafka      KafkaConfig
}

type AppConfig struct {
	Name      string
	Version   string
	JWTSecret string
}

type HTTPConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type ClickHouseConfig struct {
	Addresses []string
	Database  string
	Username  string
	Password  string
}

type KafkaConfig struct {
	Brokers                []string
	Topics                 []string
	GroupID                string
	ConsumerCommitInterval time.Duration
}

func NewConfig() (*Config, error) {
	commitInterval, err := time.ParseDuration(getEnv("KAFKA_CONSUMER_COMMIT_INTERVAL", "1s"))
	if err != nil {
		return nil, err
	}

	return &Config{
		App: AppConfig{
			Name:      getEnv("APP_NAME", "analytics-service"),
			Version:   getEnv("APP_VERSION", "1.0.0"),
			JWTSecret: getEnv("JWT_SECRET", "super-secret-jwt-key-beatmarket"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8080"),
			ReadTimeout:     5 * time.Second,
			WriteTimeout:    10 * time.Second,
			ShutdownTimeout: 15 * time.Second,
		},
		ClickHouse: ClickHouseConfig{
			Addresses: strings.Split(getEnv("CLICKHOUSE_ADDRS", "localhost:9000"), ","),
			Database:  getEnv("CLICKHOUSE_DATABASE", "analytics"),
			Username:  getEnv("CLICKHOUSE_USER", "default"),
			Password:  getEnv("CLICKHOUSE_PASSWORD", ""),
		},
		Kafka: KafkaConfig{
			Brokers:                strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
			Topics:                 strings.Split(getEnv("KAFKA_TOPICS", "user_registered,beat_added,beat_deleted,beat_rated,comment_added,beat_purchased"), ","),
			GroupID:                getEnv("KAFKA_GROUP_ID", "analytics-service-group"),
			ConsumerCommitInterval: commitInterval,
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
