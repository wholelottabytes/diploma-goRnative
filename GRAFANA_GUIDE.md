# 📊 GRAFANA DASHBOARDS - QUICK GUIDE

## 🎯 Все Дашборды (5 штук)

### 1. Business Analytics ⭐ (НОВЫЙ!)
**URL**: http://localhost:3000/d/beatmarket-business  
**Для**: Бизнес аналитиков, менеджеров  
**Что показывает**:
- ✅ Total Beats (из HTTP запросов)
- ⏳ Beat Views (требует реализации)
- ⏳ Beat Likes (требует реализации)
- ⏳ Revenue (требует реализации)
- ✅ HTTP Request Rate (реальные данные)
- ⏳ Active Users (требует реализации)

**Данные**: Prometheus (автоматические + бизнес метрики)

---

### 2. Developer Dashboard
**URL**: http://localhost:3000/d/beatmarket-dev  
**Для**: Разработчиков, DevOps  
**Что показывает**:
- ✅ Error rates by service
- ✅ Memory usage (Go heap)
- ✅ Goroutines count
- ✅ GC duration
- ✅ Kafka consumer lag
- ✅ Recent errors (Elasticsearch)

**Данные**: Prometheus + Elasticsearch

---

### 3. Main Dashboard
**URL**: http://localhost:3000/d/beatmarket-main  
**Для**: Быстрого обзора  
**Что показывает**:
- ✅ Services status (UP/DOWN)
- ✅ Go memory usage
- ✅ Goroutines

**Данные**: Prometheus

---

### 4. User Statistics
**URL**: http://localhost:3000/d/beatmarket-user  
**Для**: Аналитики по пользователям  
**Что показывает**:
- ✅ Auth service logins (HTTP requests)
- ✅ User service requests
- ✅ Beat service requests
- ✅ Response times
- ✅ Error rates
- ✅ Service endpoints activity

**Данные**: Prometheus (HTTP метрики)

---

### 5. Test Dashboard
**URL**: http://localhost:3000/d/FXpsf8cDz  
**Для**: Тестирования  
**Что показывает**:
- ✅ Services UP/DOWN
- ✅ Go memory usage

**Данные**: Prometheus

---

## 🔍 ОТКУДА БЕРУТСЯ ДАННЫЕ

### Автоматически (из Go runtime) ✅
Эти метрики **работают сразу** без изменения кода:

| Метрика | Что показывает | Откуда |
|---------|----------------|--------|
| `up` | Статус сервиса (1=UP, 0=DOWN) | Prometheus scrape |
| `go_goroutines` | Количество горутин | Go runtime |
| `go_memstats_alloc_bytes` | Использованная память | Go runtime |
| `go_gc_duration_seconds` | Время сборки мусора | Go runtime |
| `http_requests_total` | HTTP запросы | Middleware в pkg/middleware |
| `http_request_duration_seconds` | Время ответа HTTP | Middleware в pkg/middleware |

**Где в коде**:
```
/home/bns/diploma-goRnative/pkg/metrics/metrics.go
/home/bns/diploma-goRnative/pkg/middleware/middleware.go
```

### Бизнес-метрики (требуют реализации) ⏳
Этих метрик **НЕТ** в коде пока их не добавишь:

| Метрика | Где добавить | Пример |
|---------|--------------|--------|
| `beat_views_total{beat_id}` | beat-service | При просмотре бита |
| `beat_likes_total{beat_id}` | interaction-service | При лайке |
| `beat_purchases_total{beat_id}` | order-service | При покупке |
| `user_logins_total{user_id}` | auth-service | При логине |
| `user_revenue_total{user_id}` | wallet-service | При оплате |

**Пример добавления**:
```go
// В beat-service/internal/service/beat/service.go

var beatViews = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "beat_views_total",
        Help: "Total number of beat views",
    },
    []string{"beat_id", "beat_title"},
)

func init() {
    prometheus.MustRegister(beatViews)
}

// В функции GetBeat:
beatViews.WithLabelValues(beat.ID, beat.Title).Inc()
```

---

## ⏱️ Когда появляются графики

| Время после запуска | Что видно |
|---------------------|-----------|
| 0-15 сек | Пусто (нет данных) |
| 15-30 сек | 1-2 точки |
| 1-2 мин |开始出现 линии |
| 5+ мин | Красивые графики |
| 1 час | Полная история |

**Почему**: Prometheus собирает метрики каждые 15 секунд (`scrape_interval: 15s`)

---

## 🛠️ Как обновить дашборды

### Вариант 1: Через API (автоматически)
```bash
curl -X POST -u admin:admin \
  -H "Content-Type: application/json" \
  -d @dashboard.json \
  http://localhost:3000/api/dashboards/db
```

### Вариант 2: Через UI Grafana
1. Открыть дашборд
2. Нажать "Edit"
3. Изменить panel
4. Save

---

## 📈 Что СЕЙЧАС работает

### ✅ Работает (автоматические метрики):
- Статус сервисов (UP/DOWN)
- Память Go (heap)
- Горутины
- HTTP запросы (rate, duration, errors)
- GC duration

### ⏳ Требует реализации (бизнес метрики):
- Просмотры битов
- Лайки
- Покупки
- Доход по юзерам
- Активные юзеры

---

## 🎯 Рекомендации

1. **Для быстрого старта**: Используй **Main Dashboard**
2. **Для разработки**: **Developer Dashboard**  
3. **Для бизнеса**: **Business Analytics** (покажет 0 пока не добавишь метрики)
4. **Для аналитики**: **User Statistics** (HTTP метрики уже работают)

---

## 🔗 Полезные ссылки

- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Prometheus Query**: http://localhost:9090/graph
- **Kibana**: http://localhost:5601
- **Kafka UI**: http://localhost:8082
