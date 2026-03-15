package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// NewHTTPMetrics registers and returns Prometheus HTTP metrics for a service.
// Each metric will include a 'service' label for centralized dashboarding.
func NewHTTPMetrics(serviceName string) (requestsTotal *prometheus.CounterVec, requestDuration *prometheus.HistogramVec) {
	requestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests",
		ConstLabels: prometheus.Labels{"service": serviceName},
	}, []string{"method", "path", "status"})

	requestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "http_request_duration_seconds",
		Help: "Duration of HTTP requests in seconds",
		ConstLabels: prometheus.Labels{"service": serviceName},
		Buckets:   prometheus.DefBuckets,
	}, []string{"method", "path"})
	return
}

// NewKafkaMetrics registers Kafka publish metrics.
func NewKafkaMetrics(serviceName string) *prometheus.CounterVec {
	return promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "kafka_messages_published_total",
		Help: "Total number of Kafka messages published",
		ConstLabels: prometheus.Labels{"service": serviceName},
	}, []string{"topic"})
}
