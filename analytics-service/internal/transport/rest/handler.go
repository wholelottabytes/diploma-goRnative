package rest

import (
	"net/http"

	"github.com/bns/analytics-service/internal/service"
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
	requestsTotal, requestDuration := metrics.NewHTTPMetrics("analytics_service")
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

	analytics := router.Group("/api/v1/analytics")
	{
		analytics.GET("/beats/:id/stats", h.getBeatStats)
	}
}

func (h *Handler) getBeatStats(c *gin.Context) {
	beatID := c.Param("id")
	views, sales, avgRating, err := h.services.Analytics.GetBeatStats(c.Request.Context(), beatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"views":      views,
		"sales":      sales,
		"avg_rating": avgRating,
	})
}
