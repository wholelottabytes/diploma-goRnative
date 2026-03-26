# 📊 Monitoring & Grafana Guide

## Quick Start

### Access URLs:
```
Grafana:     http://localhost:3000  (admin/admin)
Prometheus:  http://localhost:9090
Kibana:      http://localhost:5601
Kafka UI:    http://localhost:8082
```

## 🔍 Prometheus vs Grafana - What's the Difference?

### **Prometheus** (Database + Collector)
- **What it does**: Collects and stores metrics (numbers over time)
- **Think of it as**: A time-series database
- **Stores**: CPU usage, memory, request counts, error rates, etc.
- **Query language**: PromQL (Prometheus Query Language)
- **Example queries**:
  - `rate(http_requests_total[1m])` - requests per second
  - `up{job="auth-service"}` - is service up? (1=up, 0=down)

### **Grafana** (Visualization)
- **What it does**: Displays data from Prometheus (and other sources) as beautiful graphs
- **Think of it as**: A dashboard builder
- **Connects to**: Prometheus, Elasticsearch, ClickHouse, PostgreSQL, etc.
- **Features**: Graphs, tables, alerts, annotations
- **You use it to**: See pretty charts instead of raw numbers

### **Analogy**:
- **Prometheus** = Excel spreadsheet with numbers
- **Grafana** = PowerPoint with charts made from Excel data

## 📈 Available Dashboards

### 1. Main Dashboard (`/d/beatmarket-main`)
**For**: Everyone
- Service health status (UP/DOWN)
- HTTP request rates
- Response times
- Active users
- Beat views & purchases

### 2. User Statistics (`/d/beatmarket-user`)
**For**: Business users, product managers
- Total beats, views, likes, revenue
- Top beats by views/revenue
- Beat statistics table

### 3. Developer Dashboard (`/d/beatmarket-dev`)
**For**: Developers, DevOps
- Error rates by service
- Memory usage
- GC duration
- Kafka consumer lag
- Recent errors (from Elasticsearch)

## 🎯 Key Metrics Explained

### Service Health
```
up{job="auth-service"} = 1  → Service is UP
up{job="auth-service"} = 0  → Service is DOWN
```

### HTTP Metrics
```
http_requests_total       → Total HTTP requests
http_request_duration     → Request latency
http_requests_total{status="500"}  → Server errors
```

### Business Metrics (when implemented)
```
beat_views_total          → Total beat plays
beat_likes_total          → Total likes
beat_purchases_total      → Total purchases
user_logins_total         → User logins
```

## 🔧 How to Add New Metrics

### 1. In your Go service:
```go
import "github.com/prometheus/client_golang/prometheus"

var beatViews = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "beat_views_total",
        Help: "Total number of beat views",
    },
    []string{"beat_id"},
)

// Increment counter
beatViews.WithLabelValues(beatID).Inc()
```

### 2. Register in main.go:
```go
prometheus.MustRegister(beatViews)
```

### 3. Query in Grafana:
```
rate(beat_views_total[1m])
```

## 🚨 Alerting

Grafana can send alerts when:
- Service goes DOWN (`up == 0`)
- Error rate > threshold
- Response time > threshold
- Memory usage > 80%

## 📝 Test User Statistics

The test user (`user@example.com` / `password1`) has:
- **Beats created**: 3 (Chill Lo-Fi, Epic Trap, Smooth R&B)
- **Total views**: Tracked in Prometheus
- **Total likes**: Tracked in Prometheus
- **Revenue**: Calculated from purchases

## 🎨 React Native Error Handling

All errors are now in **English without emojis**:

### Audio Error:
```
Audio Loading Error
Failed to load audio file. Please check:
• Internet connection
• Server availability
• URL correctness
```

### Image Error:
Shows placeholder with red border:
```
Image
Not Loaded
```

## 📱 Testing the App

1. **Connect phone** via USB or same WiFi
2. **ADB Reverse** (for USB):
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:8000 tcp:8000
   adb reverse tcp:9010 tcp:9010
   ```

3. **Open app** → Login with:
   - Email: `user@example.com`
   - Password: `password1`

4. **Test beats**:
   - Tap any beat to see details
   - Press play button to listen
   - Image should load (or show error placeholder)

## 🐛 Troubleshooting

### Grafana not starting:
```bash
docker-compose up -d grafana --force-recreate
```

### Metrics not showing:
```bash
curl http://localhost:9090/api/v1/targets  # Check Prometheus targets
```

### No data in dashboards:
1. Check if services are UP in Prometheus
2. Generate some traffic (use the app)
3. Wait 1-2 minutes for metrics to appear

### React Native images not loading:
- Check MinIO is accessible: `curl http://localhost:9010`
- Verify beat has valid image_url
- Check ADB reverse for port 9010
