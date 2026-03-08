package rest

import (
	"net/http"

	"github.com/bns/order-service/internal/service"
	"github.com/bns/order-service/internal/transport/rest/order"
	"github.com/bns/pkg/metrics"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

type Handler struct {
	services         *service.Services
	requestsTotal    *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
}

func NewHandler(services *service.Services) *Handler {
	requestsTotal, requestDuration := metrics.NewHTTPMetrics("order_service")
	return &Handler{
		services:        services,
		requestsTotal:   requestsTotal,
		requestDuration: requestDuration,
	}
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.Use(middleware.Metrics(h.requestsTotal, h.requestDuration))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	apiV1 := router.Group("/api/v1")

	orderHandler := order.NewHandler(h.services.Order, h.services.Config.App.JWTSecret)
	orderHandler.RegisterRoutes(apiV1)
}
