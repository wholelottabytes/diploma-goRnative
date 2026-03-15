package rest

import (
	"net/http"

	"github.com/bns/pkg/metrics"
	"github.com/bns/pkg/middleware"
	"github.com/bns/user-service/internal/service"
	"github.com/bns/user-service/internal/transport/rest/user"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

type Handler struct {
	services         *service.Services
	requestsTotal    *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
}

func NewHandler(services *service.Services) *Handler {
	requestsTotal, requestDuration := metrics.NewHTTPMetrics("user_service")
	return &Handler{
		services:        services,
		requestsTotal:   requestsTotal,
		requestDuration: requestDuration,
	}
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.Use(middleware.Metrics(h.requestsTotal, h.requestDuration))

	apiV1 := router.Group("/api/v1")

	// Health check
	apiV1.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	userHandler := user.NewHandler(h.services.User, h.services.Config.App.JWTSecret)
	userHandler.RegisterRoutes(apiV1)
}
