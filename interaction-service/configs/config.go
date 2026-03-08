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
	Brokers []string
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

	return &Config{
		App: AppConfig{
			Name:      getEnv("APP_NAME", "interaction-service"),
			Version:   getEnv("APP_VERSION", "1.0.0"),
			JWTSecret: getEnv("JWT_SECRET", "super-secret-jwt-key-beatmarket"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8083"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		GRPC: GRPCConfig{
			Port: getEnv("GRPC_PORT", ":9093"),
		},
		Mongo: MongoConfig{
			URI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGO_DB_NAME", "interactions"),
		},
		Kafka: KafkaConfig{
			Brokers: strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
