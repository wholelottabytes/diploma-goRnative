package seeder

import (
	"context"
	"log/slog"

	userservice "github.com/bns/user-service/internal/service/user"
)

func SeedData(userService *userservice.UserService, userRepo userservice.UserRepository) {
	// Check if there are any users in the database
	// This is a simplified check. In a real app, you might want a more robust way to check if seeding has been done.
	users, err := userRepo.FindAll(context.Background())
	if err != nil {
		slog.Error("failed to get users for seeding check", "error", err)
		return
	}

	if len(users) == 0 {
		slog.Info("no users found, seeding default user")

		// Seed a default user
		userInput := userservice.RegisterUserInput{
			Name:     "user",
			Email:    "user@example.com",
			Phone:    "1234567890",
			Password: "password1", // I'll use a password that passes the validation
			Role:     "user",
		}
		user, token, err := userService.Register(context.Background(), userInput)
		if err != nil {
			slog.Error("failed to seed user", "error", err)
			return
		}

		slog.Info("default user seeded successfully", "userID", user.ID, "token", token)

		// Top up the balance for the default user
		if err := userService.TopUpBalance(context.Background(), user.ID, 1000); err != nil {
			slog.Error("failed to top up balance for seeded user", "error", err)
		} else {
			slog.Info("topped up balance for seeded user", "userID", user.ID, "amount", 1000)
		}
	} else {
		slog.Info("users already exist, skipping seeding")
	}
}
