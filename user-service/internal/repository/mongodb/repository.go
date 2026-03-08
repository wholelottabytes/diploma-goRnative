package mongodb

import (
	mongouser "github.com/bns/user-service/internal/repository/mongodb/user"
	"go.mongodb.org/mongo-driver/mongo"
)

type Repository struct {
	UserRepository *mongouser.Repository
}

func New(db *mongo.Database) *Repository {
	return &Repository{
		UserRepository: mongouser.NewRepository(db),
	}
}
