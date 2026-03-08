package mongodb

import (
	"context"
	"time"

	"github.com/bns/interaction-service/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	ratingsCollection  = "ratings"
	commentsCollection = "comments"
)

type InteractionRepository struct {
	db *mongo.Database
}

func New(db *mongo.Database) *InteractionRepository {
	return &InteractionRepository{
		db: db,
	}
}

func (r *InteractionRepository) CreateComment(ctx context.Context, comment *models.Comment) (string, error) {
	comment.ID = primitive.NewObjectID().Hex()
	if comment.CreatedAt.IsZero() {
		comment.CreatedAt = time.Now()
	}

	_, err := r.db.Collection(commentsCollection).InsertOne(ctx, comment)
	if err != nil {
		return "", err
	}
	return comment.ID, nil
}

func (r *InteractionRepository) UpsertRating(ctx context.Context, rating *models.Rating) error {
	if rating.CreatedAt.IsZero() {
		rating.CreatedAt = time.Now()
	}

	opts := options.Update().SetUpsert(true)
	filter := bson.M{
		"beat_id": rating.BeatID,
		"user_id": rating.UserID,
	}
	update := bson.M{
		"$set": rating,
	}

	_, err := r.db.Collection(ratingsCollection).UpdateOne(ctx, filter, update, opts)
	return err
}

func (r *InteractionRepository) GetUserRating(ctx context.Context, beatID, userID string) (*models.Rating, error) {
	var rating models.Rating
	err := r.db.Collection(ratingsCollection).FindOne(ctx, bson.M{
		"beat_id": beatID,
		"user_id": userID,
	}).Decode(&rating)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &rating, err
}

func (r *InteractionRepository) GetCommentsByBeatID(ctx context.Context, beatID string, page, limit int64) ([]*models.Comment, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip((page - 1) * limit).
		SetLimit(limit)

	cursor, err := r.db.Collection(commentsCollection).Find(ctx, bson.M{"beat_id": beatID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, err
	}
	return comments, nil
}

func (r *InteractionRepository) GetAverageRatingByBeatID(ctx context.Context, beatID string) (float64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"beat_id": beatID}}},
		{{Key: "$group", Value: bson.M{
			"_id":       nil,
			"avgRating": bson.M{"$avg": "$value"},
			"count":     bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.db.Collection(ratingsCollection).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		AvgRating float64 `bson:"avgRating"`
		Count     int64   `bson:"count"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return 0, 0, err
	}

	if len(results) == 0 {
		return 0, 0, nil
	}

	return results[0].AvgRating, results[0].Count, nil
}

func (r *InteractionRepository) UpdateComment(ctx context.Context, id, userID, text string) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	res, err := r.db.Collection(commentsCollection).UpdateOne(
		ctx,
		bson.M{"_id": objID, "user_id": userID},
		bson.M{"$set": bson.M{"text": text}},
	)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}

func (r *InteractionRepository) DeleteComment(ctx context.Context, id, userID string) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	res, err := r.db.Collection(commentsCollection).DeleteOne(ctx, bson.M{"_id": objID, "user_id": userID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}

func (r *InteractionRepository) GetLikedBeatIDs(ctx context.Context, userID string) ([]string, error) {
	cursor, err := r.db.Collection(ratingsCollection).Find(ctx, bson.M{"user_id": userID, "value": bson.M{"$gt": 0}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var ratings []*models.Rating
	if err := cursor.All(ctx, &ratings); err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(ratings))
	for _, r := range ratings {
		ids = append(ids, r.BeatID)
	}
	return ids, nil
}

