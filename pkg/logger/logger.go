package logger

import (
	"log/slog"
	"os"
)

var Log *slog.Logger

func InitLogger() {
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}
	handler := slog.NewJSONHandler(os.Stdout, opts)
	Log = slog.New(handler)
	slog.SetDefault(Log)
}

func Info(msg string, args ...any) {
	if Log != nil {
		Log.Info(msg, args...)
	} else {
		slog.Info(msg, args...)
	}
}

func Error(msg string, args ...any) {
	if Log != nil {
		Log.Error(msg, args...)
	} else {
		slog.Error(msg, args...)
	}
}

func Debug(msg string, args ...any) {
	if Log != nil {
		Log.Debug(msg, args...)
	} else {
		slog.Debug(msg, args...)
	}
}

func Warn(msg string, args ...any) {
	if Log != nil {
		Log.Warn(msg, args...)
	} else {
		slog.Warn(msg, args...)
	}
}

func Fatal(msg string, args ...any) {
	if Log != nil {
		Log.Error(msg, args...)
	} else {
		slog.Error(msg, args...)
	}
	os.Exit(1)
}
