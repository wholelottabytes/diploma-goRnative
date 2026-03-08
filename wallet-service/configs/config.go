package configs

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	App      AppConfig
	HTTP     HTTPConfig
	GRPC     GRPCConfig
	Postgres PostgresConfig
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

type PostgresConfig struct {
	DSN string
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

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("PG_HOST", "localhost"),
		getEnv("PG_PORT", "5432"),
		getEnv("PG_USER", "user"),
		getEnv("PG_PASSWORD", "password"),
		getEnv("PG_DBNAME", "wallet_db"),
	)

	return &Config{
		App: AppConfig{
			Name:      getEnv("APP_NAME", "wallet-service"),
			Version:   getEnv("APP_VERSION", "1.0.0"),
			JWTSecret: getEnv("JWT_SECRET", "super-secret-jwt-key-beatmarket"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8085"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		GRPC: GRPCConfig{
			Port: getEnv("GRPC_PORT", ":9095"),
		},
		Postgres: PostgresConfig{
			DSN: dsn,
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
