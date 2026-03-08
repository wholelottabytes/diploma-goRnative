package models

import "time"

type User struct {
	ID           string    `bson:"_id,omitempty" json:"id"`
	Name         string    `bson:"name" json:"name"`
	Avatar       string    `bson:"avatar" json:"avatar"`
	Email        string    `bson:"email" json:"email"`
	Phone        string    `bson:"phone" json:"phone"`
	PasswordHash string    `bson:"passwordhash" json:"-"`
	Roles        []string  `bson:"roles" json:"roles"`
	Rating       float64   `bson:"rating" json:"rating"`
	CreatedAt    time.Time `bson:"createdat" json:"createdAt"`
	UpdatedAt    time.Time `bson:"updatedat" json:"updatedAt"`
	DeletedAt    time.Time `bson:"deletedat,omitempty" json:"-"`
}
