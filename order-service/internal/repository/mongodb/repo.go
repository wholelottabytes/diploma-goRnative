package mongodb

import (
	"context"
	"time"

	"github.com/bns/order-service/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const ordersCollection = "orders"

type OrderRepository struct {
	db *mongo.Database
}

func New(db *mongo.Database) *OrderRepository {
	return &OrderRepository{
		db: db,
	}
}

func (r *OrderRepository) Create(ctx context.Context, order *models.Order) (string, error) {
	order.ID = primitive.NewObjectID().Hex()
	if order.CreatedAt.IsZero() {
		order.CreatedAt = time.Now()
	}

	_, err := r.db.Collection(ordersCollection).InsertOne(ctx, order)
	if err != nil {
		return "", err
	}
	return order.ID, nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id string) (*models.Order, error) {
	var order models.Order
	objID, _ := primitive.ObjectIDFromHex(id)
	err := r.db.Collection(ordersCollection).FindOne(ctx, bson.M{"_id": objID}).Decode(&order)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &order, err
}

func (r *OrderRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Order, error) {
	cursor, err := r.db.Collection(ordersCollection).Find(ctx, bson.M{"user_id": userID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []*models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) HasPurchased(ctx context.Context, userID, beatID string) (bool, error) {
	count, err := r.db.Collection(ordersCollection).CountDocuments(ctx, bson.M{
		"user_id": userID,
		"beat_id": beatID,
		"status":  "completed",
	})
	return count > 0, err
}
