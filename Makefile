.PHONY: up down restart status logs metro app health clean install wait-for-services wait-for-api fix-502

# Configuration
DOCKER_COMPOSE := docker-compose
RDIR := rnat
METRO_PORT := 8081
API_PORT := 8000
TIMEOUT := 120

# ═══════════════════════════════════════════════════════════
# 🚀 MAIN COMMANDS
# ═══════════════════════════════════════════════════════════

## Start everything (Docker + Metro + App)
up: install-docker
	@echo "🚀 Starting full stack..."
	@echo "🐳 Starting Docker services..."
	@$(DOCKER_COMPOSE) up -d
	@make wait-for-services
	@echo "📱 Starting Metro..."
	@make metro
	@make wait-for-api
	@make app
	@echo ""
	@echo "╔══════════════════════════════════════════════════╗"
	@echo "║  ✅ FULL STACK READY!                            ║"
	@echo "║  API:      http://localhost:$(API_PORT)           ║"
	@echo "║  Metro:    http://localhost:$(METRO_PORT)         ║"
	@echo "║  Grafana:  http://localhost:3000                 ║"
	@echo "╚══════════════════════════════════════════════════╝"

## Stop everything
down:
	@echo "🛑 Stopping everything..."
	@-$(DOCKER_COMPOSE) down
	@-pkill -f "metro" 2>/dev/null || true
	@-pkill -f "react-native" 2>/dev/null || true
	@echo "✅ Everything stopped."

## Restart everything
restart: down up

## Quick restart without full teardown
quick-restart:
	@echo "🔄 Quick restart..."
	@$(DOCKER_COMPOSE) restart
	@make metro
	@make app
	@echo "✅ Quick restart done!"

# ═══════════════════════════════════════════════════════════
# 🔍 STATUS & HEALTH
# ═══════════════════════════════════════════════════════════

## Show status of all services
status:
	@echo "📊 Docker Services:"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "📱 Metro:"
	@ps aux | grep -E "metro|react-native" | grep -v grep || echo "❌ Not running"
	@echo ""
	@echo "📡 ADB:"
	@adb devices 2>/dev/null || echo "❌ Not connected"
	@echo ""
	@make health

## Run health checks
health:
	@echo "🔍 Health Checks:"
	@curl -s -o /dev/null -w "API Gateway: %{http_code}\n" http://localhost:$(API_PORT)/api/auth/health 2>/dev/null || echo "API Gateway: ❌"
	@curl -s -o /dev/null -w "Metro: %{http_code}\n" http://localhost:$(METRO_PORT)/status 2>/dev/null || echo "Metro: ❌"
	@adb devices 2>/dev/null | grep -q "device" && echo "ADB: ✅" || echo "ADB: ❌"

## Show logs
logs:
	@$(DOCKER_COMPOSE) logs -f --tail=50

## Show Metro logs
metro-logs:
	@tail -f /tmp/metro.log 2>/dev/null || echo "Metro not running"

# ═══════════════════════════════════════════════════════════
# 🛠️  FIXES & UTILITIES
# ═══════════════════════════════════════════════════════════

## Fix 502 Bad Gateway
fix-502:
	@echo "🔧 Fixing 502 Bad Gateway..."
	@echo "⏳ Restarting Nginx..."
	@$(DOCKER_COMPOSE) restart nginx
	@echo "⏳ Waiting for backends..."
	@sleep 5
	@make wait-for-api
	@echo "✅ 502 fixed!"

## Fix Metro connection issues
fix-metro:
	@echo "🔧 Fixing Metro connection..."
	@make metro
	@adb reverse tcp:$(METRO_PORT) tcp:$(METRO_PORT)
	@adb reverse tcp:$(API_PORT) tcp:$(API_PORT)
	@adb reverse tcp:9010 tcp:9010
	@adb shell am force-stop com.rnat 2>/dev/null || true
	@sleep 2
	@adb shell am start -n com.rnat/.MainActivity 2>/dev/null || true
	@echo "✅ Metro fixed!"

## Clean everything
clean:
	@echo "🧹 Cleaning up..."
	@-$(DOCKER_COMPOSE) down -v --remove-orphans
	@-pkill -f "metro" 2>/dev/null || true
	@-pkill -f "react-native" 2>/dev/null || true
	@-docker system prune -f
	@echo "✅ Cleaned!"

# ═══════════════════════════════════════════════════════════
# 📱 MOBILE APP
# ═══════════════════════════════════════════════════════════

## Restart app on phone (Build & Install)
app:
	@echo "📱 Building and installing app via run-android..."
	@cd $(RDIR) && npx react-native run-android

# ═══════════════════════════════════════════════════════════
# 🏗️  INTERNAL TARGETS
# ═══════════════════════════════════════════════════════════

install-docker:
	@docker info > /dev/null 2>&1 || (echo "❌ Docker not running. Start it first!" && exit 1)

wait-for-services:
	@echo "⏳ Waiting for databases to be healthy (max $(TIMEOUT)s)..."
	@timeout $(TIMEOUT) bash -c '\
		while ! $(DOCKER_COMPOSE) ps | grep -q "healthy"; do \
			sleep 2; \
		done' || (echo "❌ Timeout waiting for databases" && exit 1)
	@echo "✅ Databases ready!"

wait-for-api:
	@echo "⏳ Waiting for API Gateway (max $(TIMEOUT)s)..."
	@timeout $(TIMEOUT) bash -c '\
		until curl -s -o /dev/null -w "%{http_code}" http://localhost:$(API_PORT)/api/auth/health | grep -q "200"; do \
			sleep 2; \
		done' || (echo "❌ API Gateway not ready" && exit 1)
	@echo "✅ API Gateway ready!"

metro:
	@echo "🚀 Starting Metro..."
	@cd $(RDIR) && nohup npm start > /tmp/metro.log 2>&1 &
	@echo "⏳ Metro starting (10s)..."
	@sleep 10
	@echo "✅ Metro started! Logs: tail -f /tmp/metro.log"
