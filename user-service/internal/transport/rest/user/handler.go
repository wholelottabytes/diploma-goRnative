package user

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/bns/pkg/apperrors"
	"github.com/bns/pkg/middleware"
	"github.com/bns/user-service/internal/models"
	userservice "github.com/bns/user-service/internal/service/user"
	"github.com/gin-gonic/gin"
)

type UserService interface {
	Register(ctx context.Context, input userservice.RegisterUserInput) (*models.User, error)
	GetProfile(ctx context.Context, userID string) (*models.User, error)
	UpdateProfile(ctx context.Context, userID, name, phone, email string) (*models.User, error)
	DeleteProfile(ctx context.Context, userID string) error
	ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error
	AssignRole(ctx context.Context, userID, role string) error
	TopUpBalance(ctx context.Context, userID string, amount float64) error
	GetBalance(ctx context.Context, userID string) (float64, error)
}

type Handler struct {
	userService UserService
	jwtSecret   string
}

func NewHandler(userService UserService, jwtSecret string) *Handler {
	return &Handler{
		userService: userService,
		jwtSecret:   jwtSecret,
	}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	router.POST("/register", h.register)

	authGroup := router.Group("/")
	authGroup.Use(middleware.Auth(h.jwtSecret))
	{
		authGroup.GET("/profile", h.getProfile)
		authGroup.PUT("/profile", h.updateProfile)
		authGroup.DELETE("/profile", h.deleteProfile)
		authGroup.PUT("/profile/password", h.changePassword)
		authGroup.PUT("/profile/balance", h.topUpBalance)
		authGroup.GET("/profile/balance", h.getBalance)
	}

	adminGroup := router.Group("/admin")
	adminGroup.Use(middleware.Auth(h.jwtSecret), h.adminAuthMiddleware())
	{
		adminGroup.PUT("/users/:id/roles", h.assignRole)
	}
}

// No longer needed: authMiddleware replaced by middleware.Auth

func (h *Handler) adminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		rolesStr, exists := c.Get("userRoles")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}

		roles := strings.Split(rolesStr.(string), ",")
		isAdmin := false
		for _, role := range roles {
			if role == "admin" {
				isAdmin = true
				break
			}
		}

		if !isAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}

		c.Next()
	}
}

func (h *Handler) register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	input := userservice.RegisterUserInput{
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Password: req.Password,
		Role:     req.Role,
	}

	user, err := h.userService.Register(c.Request.Context(), input)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperrors.ErrInvalidRole) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, toUserResponse(user))
}

func (h *Handler) getProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	user, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get profile"})
		return
	}

	c.JSON(http.StatusOK, toUserResponse(user))
}

func (h *Handler) updateProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.userService.UpdateProfile(c.Request.Context(), userID, req.Name, req.Phone, req.Email)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperrors.ErrUserExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, toUserResponse(user))
}

func (h *Handler) deleteProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	err := h.userService.DeleteProfile(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete profile"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) changePassword(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	err := h.userService.ChangePassword(c.Request.Context(), userID, req.OldPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperrors.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to change password"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) assignRole(c *gin.Context) {
	targetUserID := c.Param("id")

	var req assignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	err := h.userService.AssignRole(c.Request.Context(), targetUserID, req.Role)
	if err != nil {
		if errors.Is(err, apperrors.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperrors.ErrRoleCannotBeAssigned) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to assign role"})
		return
	}

	c.Status(http.StatusNoContent)
}

type registerRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required"`
}

type updateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Phone string `json:"phone" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

type changePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

type assignRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

type userResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Roles     []string  `json:"roles"`
	Rating    float64   `json:"rating"`
	CreatedAt time.Time `json:"createdAt"`
}

func toUserResponse(user *models.User) userResponse {
	return userResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		Roles:     user.Roles,
		Rating:    user.Rating,
		CreatedAt: user.CreatedAt,
	}
}

type topUpBalanceRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}

func (h *Handler) topUpBalance(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req topUpBalanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.userService.TopUpBalance(c.Request.Context(), userID, req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to top up balance"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) getBalance(c *gin.Context) {
	userID := middleware.GetUserID(c)

	balance, err := h.userService.GetBalance(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get balance"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"balance": balance})
}
