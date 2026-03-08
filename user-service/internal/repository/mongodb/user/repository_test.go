package user_test

import (
	"context"
	"testing"
	"time"

	"github.com/bns/pkg/apperrors"
	"github.com/bns/user-service/internal/models"
	userRepo "github.com/bns/user-service/internal/repository/mongodb/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mongodb"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func setupTestDB(t *testing.T) (*mongo.Database, func()) {
	t.Helper()
	ctx := context.Background()

	mongodbContainer, err := mongodb.RunContainer(ctx,
		testcontainers.WithImage("mongo:5.0"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("Waiting for connections").
				WithOccurrence(1).
				WithStartupTimeout(5*time.Minute)),
	)
	require.NoError(t, err)

	connStr, err := mongodbContainer.ConnectionString(ctx)
	require.NoError(t, err)

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(connStr))
	require.NoError(t, err)

	dbName := "testdb"
	db := client.Database(dbName)

	indexModel := mongo.IndexModel{
		Keys:    bson.M{"email": 1},
		Options: options.Index().SetUnique(true),
	}
	_, err = db.Collection("users").Indexes().CreateOne(ctx, indexModel)
	require.NoError(t, err)

	teardown := func() {
		err = client.Disconnect(ctx)
		if err != nil {
			t.Logf("failed to disconnect from mongo: %s", err)
		}
		if err := mongodbContainer.Terminate(ctx); err != nil {
			t.Fatalf("failed to terminate container: %s", err)
		}
	}

	return db, teardown
}

func TestUserRepository_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	db, teardown := setupTestDB(t)
	defer teardown()

	repo := userRepo.NewRepository(db)

	ctx := context.Background()
	var createdUserID string

	t.Run("Create User", func(t *testing.T) {
		testCases := []struct {
			name          string
			user          *models.User
			expectedError error
		}{
			{
				name: "Success",
				user: &models.User{
					Name:  "John Doe",
					Email: "john.doe@example.com",
					Phone: "+1234567890",
				},
				expectedError: nil,
			},
			{
				name: "Duplicate Email",
				user: &models.User{
					Name:  "Jane Doe",
					Email: "john.doe@example.com",
				},
				expectedError: apperrors.ErrUserExists,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				id, err := repo.Create(ctx, tc.user)

				if tc.expectedError != nil {
					assert.ErrorIs(t, err, tc.expectedError)
				} else {
					require.NoError(t, err)
					assert.NotEmpty(t, id)
					createdUserID = id
				}
			})
		}
	})

	require.NotEmpty(t, createdUserID, "Create test must pass and set createdUserID")

	t.Run("Find User", func(t *testing.T) {
		t.Run("By ID", func(t *testing.T) {
			user, err := repo.FindByID(ctx, createdUserID)
			require.NoError(t, err)
			require.NotNil(t, user)
			assert.Equal(t, "John Doe", user.Name)
		})

		t.Run("By Email", func(t *testing.T) {
			user, err := repo.FindByEmail(ctx, "john.doe@example.com")
			require.NoError(t, err)
			require.NotNil(t, user)
			assert.Equal(t, "John Doe", user.Name)
		})

		t.Run("Not Found", func(t *testing.T) {
			user, err := repo.FindByID(ctx, "615f7b4b3e3e3e3e3e3e3e3e")
			require.NoError(t, err)
			assert.Nil(t, user)
		})
	})

	t.Run("Update User", func(t *testing.T) {
		userToUpdate, err := repo.FindByID(ctx, createdUserID)
		require.NoError(t, err)
		require.NotNil(t, userToUpdate)

		userToUpdate.Name = "Jane Doe"
		userToUpdate.Phone = "+0987654321"

		err = repo.Update(ctx, userToUpdate)
		require.NoError(t, err)

		updatedUser, err := repo.FindByID(ctx, createdUserID)
		require.NoError(t, err)
		assert.Equal(t, "Jane Doe", updatedUser.Name)
		assert.Equal(t, "+0987654321", updatedUser.Phone)
	})

	t.Run("Delete User", func(t *testing.T) {
		err := repo.Delete(ctx, createdUserID)
		require.NoError(t, err)

		deletedUser, err := repo.FindByID(ctx, createdUserID)
		require.NoError(t, err)
		assert.Nil(t, deletedUser, "User should be soft-deleted and not found by FindByID")
	})
}
