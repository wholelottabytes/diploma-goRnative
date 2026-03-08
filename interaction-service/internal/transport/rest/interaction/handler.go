package interaction

import (
	"net/http"
	"strconv"

	interactionservice "github.com/bns/interaction-service/internal/service/interaction"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	interactionService *interactionservice.InteractionService
	jwtSecret          string
}

func NewHandler(interactionService *interactionservice.InteractionService, jwtSecret string) *Handler {
	return &Handler{
		interactionService: interactionService,
		jwtSecret:          jwtSecret,
	}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	interactions := router.Group("/interactions")
	{
		// Ratings
		interactions.GET("/beats/:id/rating", h.getRating)

		// Comments
		interactions.GET("/beats/:id/comments", h.getComments)

		// Auth required
		auth := interactions.Group("")
		auth.Use(middleware.Auth(h.jwtSecret))
		{
			auth.POST("/ratings", h.rateBeat)
			auth.GET("/beats/:id/rating/me", h.getUserRating)
			auth.POST("/comments", h.addComment)
			auth.PUT("/comments/:id", h.updateComment)
			auth.DELETE("/comments/:id", h.deleteComment)
			auth.GET("/users/:id/liked", h.getLikedBeatIDs)
		}
	}
}

type rateRequest struct {
	BeatID string `json:"beat_id" binding:"required"`
	Value  int    `json:"value" binding:"required,min=1,max=5"`
}

func (h *Handler) rateBeat(c *gin.Context) {
	var req rateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	err := h.interactionService.RateBeat(c.Request.Context(), req.BeatID, userID, req.Value)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusCreated)
}

func (h *Handler) getRating(c *gin.Context) {
	beatID := c.Param("id")
	avg, count, err := h.interactionService.GetRating(c.Request.Context(), beatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"average": avg,
		"count":   count,
	})
}

func (h *Handler) getUserRating(c *gin.Context) {
	beatID := c.Param("id")
	userID := middleware.GetUserID(c)
	rating, err := h.interactionService.GetUserRating(c.Request.Context(), beatID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if rating == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "rating not found"})
		return
	}
	c.JSON(http.StatusOK, rating)
}

type commentRequest struct {
	BeatID string `json:"beat_id" binding:"required"`
	Text   string `json:"text" binding:"required"`
}

func (h *Handler) addComment(c *gin.Context) {
	var req commentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	id, err := h.interactionService.AddComment(c.Request.Context(), req.BeatID, userID, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *Handler) getComments(c *gin.Context) {
	beatID := c.Param("id")
	page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "10"), 10, 64)

	comments, err := h.interactionService.GetComments(c.Request.Context(), beatID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, comments)
}

type updateCommentRequest struct {
	Text string `json:"text" binding:"required"`
}

func (h *Handler) updateComment(c *gin.Context) {
	id := c.Param("id")
	var req updateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	err := h.interactionService.UpdateComment(c.Request.Context(), id, userID, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) deleteComment(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetUserID(c)
	err := h.interactionService.DeleteComment(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) getLikedBeatIDs(c *gin.Context) {
	userID := c.Param("id")
	ids, err := h.interactionService.GetLikedBeatIDs(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ids)
}
