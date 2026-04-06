# 📱 DIPLOMA PROJECT - FULL CONTEXT
## Мобильное приложение для публикации авторского аудиоконтента

---

## 🎯 ОБЩАЯ ИНФОРМАЦИЯ

**Название проекта:** BeatMarket  
**Тип приложения:** Мобильное приложение для продажи и покупки музыкальных битов  
**Платформа:** iOS + Android (React Native)  
**Backend:** Go микросервисы  
**База данных:** MongoDB, PostgreSQL, Elasticsearch, ClickHouse  
**Хранилище файлов:** MinIO (S3-compatible)  

**Статус:** Рабочий прототип ✅  
**Все сервисы запущены:** ✅

---

## 🏗️ АРХИТЕКТУРА

### Микросервисы (7):

1. **auth-service** (порт 8080/9090)
   - Регистрация / Авторизация
   - JWT токены
   - Redis для сессий

2. **user-service** (порт 8080/9090)
   - Профили пользователей
   - Роли: user, producer, manager
   - MongoDB

3. **beat-service** (порт 8080/9090)
   - Загрузка битов
   - Аудиофингерпринтинг (Chromaprint/fpcalc)
   - Поиск по Elasticsearch
   - MinIO для файлов

4. **interaction-service** (порт 8080)
   - Оценки (1-5 звёзд)
   - Комментарии
   - MongoDB

5. **order-service** (порт 8080)
   - Покупка битов
   - История заказов
   - MongoDB

6. **wallet-service** (порт 8080/9090)
   - Баланс пользователя
   - Пополнение (top-up)
   - Транзакции
   - PostgreSQL

7. **analytics-service** (порт 8080)
   - Статистика прослушиваний
   - ClickHouse для метрик
   - Kafka для событий

### Инфраструктура:

- **Nginx** (порт 8000) - API Gateway
- **Prometheus** (порт 9090) - Метрики
- **Grafana** (порт 3000) - Дашборды
- **Kafka** (порт 9092) - События
- **Redis** (порт 6379) - Кэш сессий
- **Kibana** (порт 5601) - Логи

---

## 📱 МОБИЛЬНОЕ ПРИЛОЖЕНИЕ (React Native)

### Экраны:

1. **LoginScreen** - Вход
2. **RegisterScreen** - Регистрация
3. **HomeScreen** - Главная (Trending + Latest)
4. **AllBeatsScreen (Explore)** - Поиск и фильтры
5. **BeatDetailsScreen** - Детали бита (оценка, комментарии, покупка)
6. **AddBeatScreen** - Загрузка бита (producer only)
7. **MyBeatsScreen** - Мои биты (producer only)
8. **LikedBeatsScreen (Rated)** - Избранное
9. **ProfileScreen** - Профиль + Become Producer
10. **ManagerScreen** - Модерация (manager only)
11. **LoadingScreen** - Экран загрузки

### Роли пользователей:

| Роль | Права |
|------|-------|
| **user** | Покупка, оценка, комментарии |
| **producer** | + Добавление битов, статистика |
| **manager** | + Модерация жалоб, удаление контента |

### Тестовые аккаунты:

```
Producer: producer@beatmarket.com / producer123
Buyer: buyer@beatmarket.com / buyer123
Manager: manager@beatmarket.com / manager123
Default: user@example.com / password1
```

---

## 🔑 КЛЮЧЕВЫЕ ФУНКЦИИ

### Для покупателей:
- ✅ Просмотр битов (Trending / Latest)
- ✅ Поиск по названию, тегам, описанию, автору
- ✅ Прослушивание превью
- ✅ Оценка (1-5 звёзд)
- ✅ Комментарии
- ✅ Покупка бита
- ✅ Избранное

### Для продюсеров:
- ✅ Загрузка битов (изображение + аудио)
- ✅ Управление каталогом (редактирование/удаление)
- ✅ Статистика (прослушивания, продажи)
- ✅ Статус "Become Producer" (сохраняется)

### Для менеджеров:
- ✅ Просмотр жалоб
- ✅ Одобрение/отклонение
- ✅ Удаление контента

---

## 🛡️ ТЕХНИЧЕСКИЕ ОСОБЕННОСТИ

### Аудиофингерпринтинг:
- **Библиотека:** Chromaprint (fpcalc)
- **Назначение:** Проверка на плагиат
- **Хранение:** Elasticsearch
- **Порог схожести:** >80% = потенциальный плагиат

### Форматы файлов:
- **Аудио:** .mp3, .wav, .flac, .ogg, .m4a
- **Изображения:** .jpg, .png, .webp, .gif
- **Макс. размер:** 10MB

### Безопасность:
- JWT токены (24 часа)
- Redis blacklist для logout
- Ролевая модель (RBAC)
- Валидация входных данных

---

## 🎨 UI/UX ОСОБЕННОСТИ

### Цветовая схема:
- **Фон:** #0A0A0F (тёмный)
- **Primary:** #A855F7 (фиолетовый)
- **Secondary:** #06B6D4 (голубой)
- **Error:** #EF4444 (красный)

### Glass Bottom Bar:
- Полупрозрачный с размытием
- Парит над низом (20px отступ)
- Закруглённые углы
- Современные outline иконки (Home, Compass, Plus, Heart, User)

### Loading Screen:
- Анимированный логотип
- Pulse dots
- 2 секунды показа

---

## 📊 АНАЛИЗ АНАЛОГОВ

### BeatStars (основной конкурент):
- **Год основания:** 2008
- **Пользователей:** 500,000+
- **Цена:** $9.99/мес + 30% комиссия (бесплатный) / 0% (Pro)
- **Недостатки:**
  - Дорогая подписка
  - Высокая комиссия
  - Сложная загрузка (10+ полей)
  - Веб-первый подход

### Airbit:
- **Цена:** $9.99/мес + 20% комиссия
- **Недостатки:**
  - Нет мобильного приложения для покупателей
  - Ограниченная аналитика в мобильной версии

### Наше решение:
- **Цена:** Бесплатно
- **Комиссия:** 5%
- **Mobile-first**
- **Загрузка в 3 шага**
- **Аудиофингерпринтинг**

---

## 📝 ИСПРАВЛЕНИЯ (Bug Fixes)

### Критические:
1. ✅ Producer role сохраняется в AsyncStorage
2. ✅ Rating/Comments/Purchase используют `beat._id` вместо `beat.id`
3. ✅ AllBeatsScreen маппинг полей backend→frontend
4. ✅ AddBeatScreen тёмная тема + отступ для камеры
5. ✅ HomeScreen карточки выровнены (padding)

### Улучшения:
1. ✅ Home: Trending (горизонтально) + Latest (вертикально)
2. ✅ Home: Только 1 тег на карточке
3. ✅ Profile: Больше места внизу (не перекрывается glass bar)
4. ✅ Manager Dashboard создан

---

## 📄 ДОКУМЕНТАЦИЯ (готовые файлы)

| Файл | Назначение |
|------|------------|
| `DIPLOMA_INTRODUCTION.md` | Введение (актуальность, цель, задачи) |
| `DIPLOMA_DESCRIPTION.md` | Описание решения |
| `DIPLOMA_BEATSTARS_ANALYSIS.md` | Анализ BeatStars (веб) |
| `DIPLOMA_MOBILE_APPS_ANALYSIS.md` | Анализ BeatStars + Airbit (мобильные) |
| `SEED_ACCOUNTS.md` | Тестовые аккаунты + AP система |
| `COMPLETE_FIXES.md` | Список всех исправлений |
| `MONITORING_GUIDE.md` | Grafana/Prometheus |
| `GRAFANA_PERSISTENCE.md` | Дашборды (сохраняются) |
| `TEST_SUITE.md` | Тесты |
| `TODO_FIXES.md` | Оставшиеся задачи |

---

## 🚀 ЗАПУСК ПРОЕКТА

### Инфраструктура:
```bash
cd /home/bns/diploma-goRnative
docker-compose up -d
```

### Мобильное приложение:
```bash
cd /home/bns/diploma-goRnative/rnat
npm start

# В другом терминале:
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
adb reverse tcp:9010 tcp:9010
npm run android
```

### Seed данные:
```bash
./scripts/seed-local-beats.sh
```

---

## 📊 МЕТРИКИ (Prometheus)

### Доступные метрики:
- `http_requests_total` - HTTP запросы
- `http_request_duration_seconds` - Время ответа
- `go_goroutines` - Горутины
- `go_memstats_alloc_bytes` - Память
- `beat_views_total` - Прослушивания (планируется)
- `beat_purchases_total` - Покупки (планируется)

### Grafana дашборды:
- Main Dashboard (сервисы UP/DOWN)
- Developer Dashboard (ошибки, память, GC)
- Business Analytics (биты, продажи, доход)
- User Statistics (юзеры, активность)

---

## 🔧 API ENDPOINTS

### Auth:
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### Beats:
```
GET  /api/beats              # Все биты
GET  /api/beats/:id          # Детали бита
POST /api/beats              # Создать (producer)
PUT  /api/beats/:id          # Редактировать (producer)
DELETE /api/beats/:id        # Удалить (producer)
POST /api/beats/upload-image
POST /api/beats/upload-audio
```

### Interactions:
```
POST /api/interactions/ratings          # Оценка
GET  /api/interactions/beats/:id/rating # Рейтинг бита
POST /api/interactions/comments         # Комментарий
GET  /api/interactions/beats/:id/comments
```

### Orders:
```
POST /api/orders            # Купить бит
GET  /api/orders/my         # Мои покупки
```

### Wallet:
```
GET  /api/wallet/balance    # Баланс
POST /api/wallet/topup      # Пополнить
GET  /api/wallet/transactions
```

### Manager:
```
GET  /api/reports/pending   # Жалобы
POST /api/reports/:id/review # Рассмотреть
```

---

## ⏳ TODO (оставшиеся задачи)

1. ⏳ Temp uploads для Add Beat (файлы не сохраняются до Submit)
2. ⏳ Auto duplicate detection (проверка при загрузке)
3. ⏳ Producer stats из Prometheus (графики в Profile)
4. ⏳ Тестирование rating/comments/purchase
5. ⏳ Manager API интеграция с фронтендом

---

## 📚 ДЛЯ ДИПЛОМА

### Главы:
1. **Введение** (актуальность, цель, задачи)
2. **Анализ аналогов** (BeatStars, Airbit)
3. **Проектирование** (архитектура, БД, API)
4. **Реализация** (клиент, сервер, интеграции)
5. **Тестирование** (unit, integration, manual)
6. **Заключение** (результаты, выводы)

### Приложения:
- A. Исходный код (ссылка на GitHub)
- B. Руководство пользователя
- C. Инструкция по развёртыванию
- D. Тестовые сценарии

---

## 💡 ВАЖНЫЕ ЗАМЕТКИ

1. **Producer role** сохраняется в AsyncStorage + обновляется при загрузке Profile
2. **HomeScreen** использует `_id` не `id` для ключей
3. **AddBeatScreen** тёмная тема с `Colors.background`
4. **Glass bar** требует `marginBottom: 5xl` для Profile
5. **Manager аккаунт** нужно создать вручную (role: "manager")
6. **Audio fingerprinting** требует установленный `fpcalc` (apt install libchromaprint-tools)

---

## 📞 КОНТАКТЫ (для контекста)

**Проект:** Дипломная работа  
**Тема:** Мобильное приложение для публикации авторского аудиоконтента  
**Уровень:** Бакалавр  
**Стек:** React Native + Go (микросервисы) + Docker  
**Статус:** Рабочий прототип готов

---

**Файл создан:** 2026-03-29  
**Последнее обновление:** 2026-03-29  
**Версия:** 1.0
