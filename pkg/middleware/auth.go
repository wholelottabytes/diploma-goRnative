package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const UserIDKey = "userID"
const UserRolesKey = "userRoles"

// CustomClaims represents the structure of the JWT claims, including custom fields.
type CustomClaims struct {
	Roles []string `json:"roles,omitempty"`
	jwt.RegisteredClaims
}

// Auth returns a Gin middleware that validates Bearer JWT tokens.
func Auth(jwtSecret string) gin.HandlerFunc {
	secret := []byte(jwtSecret)
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")

		claims := &CustomClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(UserIDKey, claims.Subject)
		c.Set(UserRolesKey, claims.Roles)
		c.Next()
	}
}

// GetUserID extracts the userID set by the Auth middleware.
func GetUserID(c *gin.Context) string {
	v, _ := c.Get(UserIDKey)
	s, _ := v.(string)
	return s
}
