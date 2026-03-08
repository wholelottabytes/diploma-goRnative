package configs

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	App   AppConfig
	HTTP  HTTPConfig
	GRPC  GRPCConfig
	Mongo MongoConfig
	Kafka KafkaConfig
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

type GRPCConfig struct {
	Port string
}

type MongoConfig struct {
	URI      string
	Database string
}

type KafkaConfig struct {
	Brokers                []string
	RatingTopic            string
	RatingGroupID          string
	ConsumerCommitInterval time.Duration
}

func NewConfig() (*Config, error) {
	readTimeout, err := time.ParseDuration(getEnv("HTTP_READ_TIMEOUT", "10s"))
	if err != nil {
		return nil, err
	}
	writeTimeout, err := time.ParseDuration(getEnv("HTTP_WRITE_TIMEOUT", "10s"))
	if err != nil {
		return nil, err
	}
	shutdownTimeout, err := time.ParseDuration(getEnv("HTTP_SHUTDOWN_TIMEOUT", "5s"))
	if err != nil {
		return nil, err
	}
	commitInterval, err := time.ParseDuration(getEnv("KAFKA_CONSUMER_COMMIT_INTERVAL", "1s"))
	if err != nil {
		return nil, err
	}

	return &Config{
		App: AppConfig{
			Name:      getEnv("APP_NAME", "user-service"),
			Version:   getEnv("APP_VERSION", "1.0.0"),
			JWTSecret: getEnv("JWT_SECRET", "super-secret-jwt-key-beatmarket"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8080"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		GRPC: GRPCConfig{
			Port: getEnv("GRPC_PORT", ":9090"),
		},
		Mongo: MongoConfig{
			URI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGO_DB_NAME", "users"),
		},
		Kafka: KafkaConfig{
			Brokers:                strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
			RatingTopic:            getEnv("KAFKA_RATING_TOPIC", "user-rating-updates"),
			RatingGroupID:          getEnv("KAFKA_RATING_GROUP_ID", "user-service-rating-group"),
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
