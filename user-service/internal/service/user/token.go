package userservice

import (
	"time"

	"github.com/bns/pkg/middleware"
	"github.com/golang-jwt/jwt/v5"
)

func (s *UserService) issueToken(userID string, roles []string) (string, error) {
	claims := middleware.CustomClaims{
		Roles: roles,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 7)), // 1 week
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}
	return signed, nil
}
