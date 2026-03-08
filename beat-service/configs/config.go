package configs

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	App           AppConfig
	HTTP          HTTPConfig
	GRPC          GRPCConfig
	Elasticsearch ElasticsearchConfig
	MinIO         MinIOConfig
	Kafka         KafkaConfig
	Clients       ClientsConfig
}

type ClientsConfig struct {
	UserServiceAddr string
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

type ElasticsearchConfig struct {
	Addresses []string
}

type MinIOConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	UseSSL          bool
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
			Name:      getEnv("APP_NAME", "beat-service"),
			Version:   getEnv("APP_VERSION", "1.0.0"),
			JWTSecret: getEnv("JWT_SECRET", "super-secret-jwt-key-beatmarket"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8082"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		GRPC: GRPCConfig{
			Port: getEnv("GRPC_PORT", ":9092"),
		},
		Elasticsearch: ElasticsearchConfig{
			Addresses: []string{getEnv("ELASTICSEARCH_ADDR", "http://localhost:9200")},
		},
		MinIO: MinIOConfig{
			Endpoint:        getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKeyID:     getEnv("MINIO_ACCESS_KEY_ID", "minioadmin"),
			SecretAccessKey: getEnv("MINIO_SECRET_ACCESS_KEY", "minioadmin"),
			UseSSL:          false,
		},
		Kafka: KafkaConfig{
			Brokers: strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		},
		Clients: ClientsConfig{
			UserServiceAddr: getEnv("USER_SERVICE_ADDR", "localhost:9091"),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
