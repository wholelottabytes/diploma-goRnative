package auth

import (
	"net/http"
	"strings"

	authservice "github.com/bns/auth-service/internal/service/auth"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Handler struct {
	authService *authservice.AuthService
}

func NewHandler(authService *authservice.AuthService) *Handler {
	return &Handler{authService: authService}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	auth := router.Group("/")
	auth.POST("/register", h.register)
	auth.POST("/login", h.login)
	auth.GET("/me", h.me)
	auth.POST("/logout", h.logout)
}

// POST /register
type registerRequest struct {
	Name     string `json:"name"     binding:"required"`
	Email    string `json:"email"    binding:"required,email"`
	Phone    string `json:"phone"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role"`
}

func (h *Handler) register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, userID, err := h.authService.Register(c.Request.Context(), authservice.RegisterInput{
		Name:     req.Name,
		Email:    strings.ToLower(req.Email),
		Phone:    req.Phone,
		Password: req.Password,
		Role:     req.Role,
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": token, "userId": userID})
}

// POST /login
type loginRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, userID, err := h.authService.Login(c.Request.Context(), authservice.UserCredentials{
		Email:    strings.ToLower(req.Email),
		Password: req.Password,
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "userId": userID})
}

// GET /me  (requires Bearer token)
func (h *Handler) me(c *gin.Context) {
	header := c.GetHeader("Authorization")
	if header == "" || !strings.HasPrefix(header, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}
	tokenStr := strings.TrimPrefix(header, "Bearer ")
	token, err := h.authService.ValidateToken(c.Request.Context(), tokenStr)
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"valid": true, "token": tokenStr})
}

// POST /logout
func (h *Handler) logout(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		header := c.GetHeader("Authorization")
		userID = strings.TrimPrefix(header, "Bearer ")
	}
	_ = h.authService.Logout(c.Request.Context(), userID)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
