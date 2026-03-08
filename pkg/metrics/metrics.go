package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// NewHTTPMetrics registers and returns Prometheus HTTP metrics for a service.
func NewHTTPMetrics(serviceName string) (requestsTotal *prometheus.CounterVec, requestDuration *prometheus.HistogramVec) {
	requestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: serviceName,
		Name:      "http_requests_total",
		Help:      "Total number of HTTP requests",
	}, []string{"method", "path", "status"})

	requestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: serviceName,
		Name:      "http_request_duration_seconds",
		Help:      "Duration of HTTP requests in seconds",
		Buckets:   prometheus.DefBuckets,
	}, []string{"method", "path"})
	return
}

// NewKafkaMetrics registers Kafka publish metrics.
func NewKafkaMetrics(serviceName string) *prometheus.CounterVec {
	return promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: serviceName,
		Name:      "kafka_messages_published_total",
		Help:      "Total number of Kafka messages published",
	}, []string{"topic"})
}
