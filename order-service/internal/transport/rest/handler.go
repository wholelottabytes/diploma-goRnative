package rest

import (
	"net/http"

	"github.com/bns/order-service/internal/service"
	"github.com/bns/order-service/internal/transport/rest/order"
	"github.com/bns/pkg/metrics"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
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

	// Metrics endpoint at root level for Prometheus
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	apiV1 := router.Group("/api/v1")

	// Health check
	apiV1.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	orderHandler := order.NewHandler(h.services.Order, h.services.Config.App.JWTSecret)
	orderHandler.RegisterRoutes(apiV1)
}
