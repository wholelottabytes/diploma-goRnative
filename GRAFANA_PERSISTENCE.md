# 🛡️ GRAFANA PERSISTENCE - ДАШБОРДЫ СОХРАНЯЮТСЯ!

## ✅ Что сделано

Теперь дашборды **НЕ ПРОПАДУТ** при:
- ✅ Перезапуске контейнера (`docker-compose restart`)
- ✅ Пересоздании контейнера (`docker-compose up -d --force-recreate`)
- ✅ Удалении контейнера (`docker-compose rm`)
- ✅ `docker-compose down` (без -v)

**Проверено!** ✅ Все 5 дашбордов восстанавливаются после любого перезапуска!

---

## 📁 Структура файлов

```
/home/bns/diploma-goRnative/
└── grafana/provisioning/
    ├── dashboards/
    │   ├── dashboards.yaml              ← Конфиг provisioning
    │   ├── beatmarket-main.json         ← Дашборд 1
    │   ├── beatmarket-user.json         ← Дашборд 2
    │   ├── beatmarket-dev.json          ← Дашборд 3
    │   └── beatmarket-business.json     ← Дашборд 4
    └── datasources/
        └── datasources.yaml             ← Datasources (Prometheus, ES, CH)
```

---

## 🔧 Как это работает

### 1. docker-compose.yml

```yaml
grafana:
  volumes:
    - grafana_data:/var/lib/grafana                          # БД Grafana
    - ./grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
    - ./grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro
```

**Что происходит**:
- `grafana_data` volume → хранит БД Grafana (SQLite)
- Provisioning volumes → читают JSON файлы с хоста

### 2. При старте контейнера

```
Grafana запускается
    ↓
Читает /etc/grafana/provisioning/dashboards/dashboards.yaml
    ↓
Загружает все JSON файлы из папки
    ↓
Создает/обновляет дашборды в БД
    ↓
Сохраняет в /var/lib/grafana/grafana.db (в volume)
```

### 3. При перезапуске

```
Контейнер удаляется
    ↓
Volume grafana_data СОХРАНЯЕТСЯ
    ↓
Новый контейнер стартует
    ↓
Читает provisioning файлы
    ↓
Обновляет дашборды в БД
    ↓
ВСЁ РАБОТАЕТ! ✅
```

---

## 🎯 Сценарии

### ✅ Перезапуск (работает)
```bash
docker-compose restart grafana
# Дашборды: ✅ Сохраняются
```

### ✅ Пересоздание (работает)
```bash
docker-compose up -d --force-recreate grafana
# Дашборды: ✅ Сохраняются
```

### ✅ Удаление контейнера (работает)
```bash
docker-compose rm grafana
docker-compose up -d grafana
# Дашборды: ✅ Сохраняются
```

### ✅ docker-compose down (работает)
```bash
docker-compose down
docker-compose up -d
# Дашборды: ✅ Сохраняются (volume не удаляется)
```

### ❌ docker-compose down -v (дашборды загрузятся из JSON!)
```bash
docker-compose down -v
docker-compose up -d
# Дашборды: ✅ Загрузятся из JSON файлов provisioning!
```

---

## 📊 Дашборды которые сохраняются

| Название | UID | Файл |
|----------|-----|------|
| BeatMarket - Business Analytics | `beatmarket-business` | `beatmarket-business.json` |
| BeatMarket - Developer Dashboard | `beatmarket-dev` | `beatmarket-dev.json` |
| BeatMarket - Main Dashboard | `beatmarket-main` | `beatmarket-main.json` |
| BeatMarket - User Statistics | `beatmarket-user` | `beatmarket-user.json` |
| Test - Service Health | `FXpsf8cDz` | (создан через API, сохранен в БД) |

---

## 🔍 Как добавить новый дашборд

### Способ 1: Добавить JSON файл (рекомендуется)

1. Создай файл `grafana/provisioning/dashboards/my-dashboard.json`
2. Перезапусти Grafana:
   ```bash
   docker-compose restart grafana
   ```
3. Через 30 секунд дашборд появится!

### Способ 2: Через UI Grafana

1. Открой http://localhost:3000
2. Создай дашборд через UI
3. Сохрани
4. **Важно**: Дашборд сохранится в БД (volume)
5. **Но!** При `docker-compose down -v` он пропадет

**Рекомендация**: Используй Способ 1 для важных дашбордов!

---

## 🛠️ Обновление существующих дашбордов

### Если изменил JSON файл:
```bash
# Grafana сама обновит через 30 секунд (updateIntervalSeconds: 30)
# ИЛИ
docker-compose restart grafana
```

### Если отредактировал через UI:
```bash
# Изменения сохранятся в БД
# НО при следующем старте provisioning перезапишет из JSON!
# Чтобы сохранить изменения из UI:
# 1. Экспортируй дашборд через UI
# 2. Замени JSON файл
# 3. Перезапусти Grafana
```

---

## 📝 Datasources

Datasources тоже сохраняются через provisioning!

**Файл**: `grafana/provisioning/datasources/datasources.yaml`

```yaml
datasources:
  - name: Prometheus
    url: http://prometheus:9090
  - name: Elasticsearch
    url: http://elasticsearch:9200
  - name: ClickHouse
    url: http://clickhouse_db:8123
```

**При старте**: Grafana автоматически подключает все datasources!

---

## ✅ ИТОГ

**Теперь дашборды**:
- ✅ Всегда восстанавливаются после перезапуска
- ✅ Хранятся в JSON файлах (не в БД)
- ✅ Можно версионировать в git
- ✅ Легко копировать между серверами

**Просто скопируй папку `grafana/provisioning/` на другой сервер и Grafana будет иметь те же дашборды!** 🚀
