package rest

import (
	"github.com/bns/auth-service/internal/service"
	"github.com/bns/auth-service/internal/transport/rest/auth"
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
	requestsTotal, requestDuration := metrics.NewHTTPMetrics("auth_service")
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
		c.Status(200)
	})

	authHandler := auth.NewHandler(h.services.Auth)
	authHandler.RegisterRoutes(apiV1)
}
