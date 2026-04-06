# 🚀 БЫСТРЫЙ СТАРТ - ВСЕГО ОДНА КОМАНДА!

## ⚡ ГЛАВНЫЕ КОМАНДЫ

```bash
# Запустить ВСЁ (Docker + Metro + Приложение)
make up

# Перезапустить всё
make restart

# Быстрый перезапуск без полной остановки
make quick-restart

# Остановить всё
make down
```

## 🔍 СТАТУС И ЛОГИ

```bash
# Показать статус всех сервисов
make status

# Проверить здоровье сервисов
make health

# Логи Docker
make logs

# Логи Metro
make metro-logs
```

## 🛠️ ФИКСЫ

```bash
# Исправить 502 Bad Gateway
make fix-502

# Исправить подключение Metro
make fix-metro

# Очистить всё
make clean
```

## 📱 ПРИЛОЖЕНИЕ

```bash
# Перезапустить приложение на телефоне
make app

# Запустить только Metro
make metro
```

---

## 🎯 ТИПИЧНЫЙ РАБОЧИЙ ПРОЦЕСС

### 1. Первый запуск (или после перезагрузки):
```bash
make up
```
**Что делает:**
- ✅ Запускает Docker (20 сервисов)
- ✅ Ждёт пока базы данных станут healthy
- ✅ Запускает Metro
- ✅ Ждёт API Gateway
- ✅ Настраивает ADB reverse
- ✅ Перезапускает приложение на телефоне

**Время:** ~2-3 минуты

### 2. Обычный день (всё уже запущено):
```bash
make quick-restart
```
**Что делает:**
- ✅ Перезапускает Docker сервисы
- ✅ Перезапускает Metro
- ✅ Перезапускает приложение

**Время:** ~30 секунд

### 3. Просто проверить статус:
```bash
make status
```

### 4. Если 502 ошибка:
```bash
make fix-502
```

### 5. Если Metro не подключается:
```bash
make fix-metro
```

---

## ❌ ЧАСТЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема: "502 Bad Gateway"
**Причина:** Nginx запустился раньше чем backend сервисы
**Решение:** `make fix-502`

### Проблема: "Cannot connect to dev server"
**Причина:** Metro не запущен или ADB reverse слетел
**Решение:** `make fix-metro`

### Проблема: "Docker not running"
**Причина:** Docker демон не запущен
**Решение:** `sudo systemctl start docker`

### Проблема: "ADB not connected"
**Причина:** Телефон отключился или USB debugging выключен
**Решение:** Переподключи USB кабель и разреши отладку

### Проблема: "npm install failed" (нет интернета)
**Причина:** Нет подключения к интернету
**Решение:** Makefile пропустит npm install если node_modules существует

---

## 📊 ПОРТЫ

| Сервис | Порт | URL |
|--------|------|-----|
| API Gateway | 8000 | http://localhost:8000 |
| Metro | 8081 | http://localhost:8081 |
| Grafana | 3000 | http://localhost:3000 |
| Prometheus | 9090 | http://localhost:9090 |
| Kafka UI | 8082 | http://localhost:8082 |
| Kibana | 5601 | http://localhost:5601 |
| MinIO | 9010 | http://localhost:9010 |

---

## 💡 СОВЕТЫ

1. **Всегда используй `make up`** вместо ручного запуска
2. **Если что-то сломалось** → `make restart`
3. **Если совсем всё плохо** → `make clean && make up`
4. **Для проверки статуса** → `make status`
5. **Для логов** → `make logs` или `make metro-logs`

---

**ТЕПЕРЬ ЗАПУСК ЗАНИМАЕТ 2 МИНУТЫ ВМЕСТО ЧАСА!** 🚀
