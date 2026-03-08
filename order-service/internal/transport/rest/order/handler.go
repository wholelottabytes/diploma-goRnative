package order

import (
	"net/http"

	orderservice "github.com/bns/order-service/internal/service/order"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	orderService *orderservice.OrderService
	jwtSecret    string
}

func NewHandler(orderService *orderservice.OrderService, jwtSecret string) *Handler {
	return &Handler{
		orderService: orderService,
		jwtSecret:    jwtSecret,
	}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	orders := router.Group("/orders")
	orders.Use(middleware.Auth(h.jwtSecret))
	{
		orders.POST("/buy", h.buyBeat)
		orders.GET("", h.getOrders)
		orders.GET("/has-purchased/:beatID", h.hasPurchased)
	}
}

type buyRequest struct {
	BeatID string `json:"beat_id" binding:"required"`
}

func (h *Handler) buyBeat(c *gin.Context) {
	var req buyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	order, err := h.orderService.BuyBeat(c.Request.Context(), userID, req.BeatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *Handler) getOrders(c *gin.Context) {
	userID := middleware.GetUserID(c)
	orders, err := h.orderService.GetUserOrders(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func (h *Handler) hasPurchased(c *gin.Context) {
	beatID := c.Param("beatID")
	userID := middleware.GetUserID(c)
	purchased, err := h.orderService.HasPurchased(c.Request.Context(), userID, beatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"purchased": purchased})
}
