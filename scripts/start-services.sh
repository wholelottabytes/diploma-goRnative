#!/bin/bash
# Proper startup sequence for BeatMarket microservices
# This ensures all dependencies are ready before dependent services start

set -e

echo "🚀 Starting BeatMarket Services..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=$2
    local attempt=1
    
    echo -ne "${YELLOW}Waiting for $service...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service 2>/dev/null | grep -q "healthy\|Up"; then
            echo -e "${GREEN} OK${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED} FAILED${NC}"
    return 1
}

# Step 1: Start infrastructure (databases, cache, message queue)
echo "📦 Step 1/5: Starting Infrastructure..."
docker-compose up -d postgres redis mongo elasticsearch clickhouse minio zookeeper kafka 2>/dev/null

# Wait for infrastructure to be healthy
sleep 10
wait_for_service "postgres_db" 30
wait_for_service "redis_cache" 30
wait_for_service "mongo_db" 30
wait_for_service "elasticsearch" 60
wait_for_service "clickhouse_db" 30
wait_for_service "minio-storage" 30
wait_for_service "kafka" 30

# Step 2: Start core services (no dependencies)
echo ""
echo "🔧 Step 2/5: Starting Core Services..."
docker-compose up -d wallet-service auth-service
sleep 5
wait_for_service "wallet_service" 30
wait_for_service "auth_service" 30

# Step 3: Start dependent services
echo ""
echo "🔗 Step 3/5: Starting Dependent Services..."
docker-compose up -d user-service beat-service interaction-service order-service analytics-service
sleep 5
wait_for_service "user_service" 30
wait_for_service "beat_service" 30
wait_for_service "interaction_service" 30
wait_for_service "order_service" 30
wait_for_service "analytics_service" 30

# Step 4: Start monitoring
echo ""
echo "📊 Step 4/5: Starting Monitoring..."
docker-compose up -d prometheus grafana kibana kafka-ui
sleep 5
wait_for_service "prometheus" 30
wait_for_service "grafana" 30

# Step 5: Start API Gateway (last!)
echo ""
echo "🌐 Step 5/5: Starting API Gateway..."
docker-compose up -d nginx
sleep 3
wait_for_service "api_gateway" 10

# Final status
echo ""
echo "========================================"
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo "========================================"
echo ""
echo "📍 Service URLs:"
echo "   API Gateway:     http://localhost:8000"
echo "   Grafana:         http://localhost:3000 (admin/admin)"
echo "   Prometheus:      http://localhost:9090"
echo "   Kibana:          http://localhost:5601"
echo "   Kafka UI:        http://localhost:8082"
echo ""
echo "📱 React Native:"
echo "   Metro:           http://localhost:8081"
echo "   ADB Reverse:     adb reverse tcp:8081 tcp:8081"
echo ""
echo "🔑 Test Credentials:"
echo "   User:    user@example.com / password1"
echo "   Manager: manager@example.com / manager123"
echo ""
