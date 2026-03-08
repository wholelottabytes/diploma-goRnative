package rest

import (
	"net/http"

	"github.com/bns/interaction-service/internal/service"
	"github.com/bns/interaction-service/internal/transport/rest/interaction"
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
	requestsTotal, requestDuration := metrics.NewHTTPMetrics("interaction_service")
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

	interactionHandler := interaction.NewHandler(h.services.Interaction, h.services.Config.App.JWTSecret)
	interactionHandler.RegisterRoutes(apiV1)
}
