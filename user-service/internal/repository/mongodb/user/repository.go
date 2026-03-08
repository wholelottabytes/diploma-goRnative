package user

import (
	"context"
	"errors"
	"time"

	"github.com/bns/pkg/apperrors"
	"github.com/bns/user-service/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const usersCollection = "users"

type Repository struct {
	db *mongo.Database
}

func NewRepository(db *mongo.Database) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, user *models.User) (string, error) {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	res, err := r.db.Collection(usersCollection).InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return "", apperrors.ErrUserExists
		}
		return "", err
	}

	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return "", apperrors.ErrDataConversion
	}

	return oid.Hex(), nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.Collection(usersCollection).FindOne(ctx, bson.M{"email": email, "deletedAt": bson.M{"$exists": false}}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, apperrors.ErrInvalidID
	}

	err = r.db.Collection(usersCollection).FindOne(ctx, bson.M{"_id": objectID, "deletedAt": bson.M{"$exists": false}}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *Repository) Update(ctx context.Context, user *models.User) error {
	objectID, err := primitive.ObjectIDFromHex(user.ID)
	if err != nil {
		return apperrors.ErrInvalidID
	}

	updatePayload := bson.M{
		"name":         user.Name,
		"email":        user.Email,
		"phone":        user.Phone,
		"passwordhash": user.PasswordHash,
		"roles":        user.Roles,
		"rating":       user.Rating,
		"updatedat":    time.Now(),
	}

	update := bson.M{
		"$set": updatePayload,
	}

	_, err = r.db.Collection(usersCollection).UpdateOne(ctx, bson.M{"_id": objectID}, update)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return apperrors.ErrInvalidID
	}

	_, err = r.db.Collection(usersCollection).UpdateOne(
		ctx,
		bson.M{"_id": objectID},
		bson.M{"$set": bson.M{"deletedAt": time.Now()}},
	)
	return err
}

func (r *Repository) UpdateBalance(ctx context.Context, id string, amount float64) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return apperrors.ErrInvalidID
	}

	_, err = r.db.Collection(usersCollection).UpdateOne(
		ctx,
		bson.M{"_id": objectID},
		bson.M{"$inc": bson.M{"balance": amount}, "$set": bson.M{"updatedat": time.Now()}},
	)
	return err
}
