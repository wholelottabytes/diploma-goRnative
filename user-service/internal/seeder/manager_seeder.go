package seeder

import (
	"context"
	"log/slog"

	"github.com/bns/user-service/internal/models"
	userservice "github.com/bns/user-service/internal/service/user"
	"github.com/bns/user-service/pkg/hash"
)

// SeedManagerAccount creates the default manager account if it doesn't exist
func SeedManagerAccount(userService *userservice.UserService, userRepo userservice.UserRepository) {
	ctx := context.Background()
	
	// Check if manager already exists
	manager, err := userRepo.FindByEmail(ctx, "manager@beatmarket.com")
	if err == nil && manager != nil {
		slog.Info("manager account already exists", slog.String("email", manager.Email))
		return
	}

	slog.Info("creating manager account...")

	hasher := hash.NewBcryptHasher()
	passwordHash, err := hasher.HashPassword("manager123")
	if err != nil {
		slog.Error("failed to hash manager password", slog.String("error", err.Error()))
		return
	}

	managerUser := &models.User{
		Name:         "Moderator",
		Email:        "manager@beatmarket.com",
		Phone:        "+1234567890",
		PasswordHash: passwordHash,
		Roles:        []string{"manager"},
		Rating:       5,
	}

	userID, err := userRepo.Create(ctx, managerUser)
	if err != nil {
		slog.Error("failed to create manager account", slog.String("error", err.Error()))
		return
	}

	slog.Info("manager account created successfully", 
		slog.String("user_id", userID),
		slog.String("email", "manager@beatmarket.com"),
		slog.String("role", "manager"))
}
