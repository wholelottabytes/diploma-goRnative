package configs

import (
	"os"
	"time"
)

type Config struct {
	App   AppConfig
	HTTP  HTTPConfig
	GRPC  GRPCConfig
	Redis RedisConfig
}

type AppConfig struct {
	Name    string
	Version string
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

type RedisConfig struct {
	Addr string
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
			Name:    getEnv("APP_NAME", "auth-service"),
			Version: getEnv("APP_VERSION", "1.0.0"),
		},
		HTTP: HTTPConfig{
			Port:            getEnv("HTTP_PORT", ":8081"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		GRPC: GRPCConfig{
			Port: getEnv("GRPC_PORT", ":9091"),
		},
		Redis: RedisConfig{
			Addr: getEnv("REDIS_ADDR", "localhost:6379"),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
