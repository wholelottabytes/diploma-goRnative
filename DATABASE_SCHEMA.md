# 🗄️ БАЗЫ ДАННЫХ И ТАБЛИЦЫ

## ОБЗОР АРХИТЕКТУРЫ

| Микросервис | База данных | Назначение |
|-------------|-------------|------------|
| auth-service | Redis | Сессии, JWT blacklist |
| user-service | MongoDB | Пользователи, профили |
| beat-service | MongoDB + Elasticsearch | Биты (metadata + search) |
| interaction-service | MongoDB | Оценки, комментарии |
| order-service | MongoDB | Заказы, покупки |
| wallet-service | PostgreSQL | Баланс, транзакции |
| analytics-service | ClickHouse | Метрики, статистика |

---

## 1. AUTH-SERVICE (Redis)

### Redis Keys:

| Key Pattern | Тип | TTL | Описание | Реализовано |
|-------------|-----|-----|----------|-------------|
| `{userId}` | String | 24h | JWT токен пользователя | ✅ Да |
| `{userId}` (при logout) | String | 24h | Удаляется при logout | ✅ Да |

### Примеры:
```
69c90d6e23fdc613a7c90faf → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Как работает:
1. **Login** → `Set(userId, token, 24h)` - сохраняем токен
2. **Validate** → `Get(userId)` - сверяем токен из JWT с Redis
3. **Logout** → `Delete(userId)` - удаляем токен (invalidation)

### НЕ реализовано (запланировано):
- ❌ `session:{userId}` - сессии
- ❌ `blacklist:{jti}` - blacklist токенов
- ❌ `ratelimit:{ip}:{endpoint}` - rate limiting

### Связи:
- `userId` → user-service (MongoDB)

---

## 2. USER-SERVICE (MongoDB)

### Database: `beatmarket`

### Collection: `users`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID пользователя |
| `name` | String | ✅ | - | Отображаемое имя |
| `email` | String | ✅ | Unique, Indexed | Email (логин) |
| `phone` | String | ❌ | - | Номер телефона |
| `passwordHash` | String | ✅ | - | Хэш пароля (bcrypt) |
| `roles` | Array[String] | ✅ | - | Роли: ["user"], ["producer"], ["manager"] |
| `rating` | Number | ✅ | - | Средний рейтинг (0-5) |
| `avatar` | String | ❌ | - | URL аватара (MinIO) |
| `bio` | String | ❌ | - | Описание профиля |
| `createdAt` | Date | ✅ | Indexed | Дата регистрации |
| `updatedAt` | Date | ✅ | - | Дата обновления |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ roles: 1 })
db.users.createIndex({ createdAt: -1 })
```

### Пример документа:
```json
{
  "_id": ObjectId("69c90d6e23fdc613a7c90faf"),
  "name": "Beat Producer",
  "email": "producer@beatmarket.com",
  "phone": "+1234567890",
  "passwordHash": "$2a$10$xyz...",
  "roles": ["user", "producer"],
  "rating": 4.5,
  "avatar": "avatars/69c90d6e23fdc613a7c90faf.jpg",
  "bio": "Professional beatmaker",
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "updatedAt": ISODate("2026-03-29T12:00:00Z")
}
```

### Связи:
- `roles` → определяет доступ к beat-service, order-service
- `rating` → агрегация из interaction-service

---

## 3. BEAT-SERVICE (MongoDB + Elasticsearch)

### Почему две базы данных?

**MongoDB** - основное хранилище (источник истины):
- ✅ Полные данные битов
- ✅ Связи с автором
- ✅ Файлы (аудио, обложки)

**Elasticsearch** - поисковый индекс:
- ✅ Быстрый полнотекстовый поиск
- ✅ Фильтрация по тегам, BPM, цене
- ✅ Сортировка по релевантности
- ❌ Не хранит полные данные (только metadata)

### Денормализация данных:

Elasticsearch **НЕ копирует** всю структуру MongoDB. Он хранит только поля для поиска:

| Поле | MongoDB | Elasticsearch | Зачем |
|------|---------|---------------|-------|
| `_id` | ✅ | ✅ | Ключ |
| `title` | ✅ | ✅ (Text) | Поиск по названию |
| `tags` | ✅ | ✅ (Keyword) | Фильтры |
| `bpm` | ✅ | ✅ (Integer) | Фильтр по темпу |
| `price` | ✅ | ✅ (Float) | Фильтр по цене |
| `authorName` | ✅ | ✅ (Text) | Поиск по автору |
| `rating` | ✅ | ✅ (Float) | Сортировка |
| `createdAt` | ✅ | ✅ (Date) | Сортировка по дате |
| `description` | ✅ | ✅ (Text) | Поиск по описанию |
| `audioUrl` | ✅ | ❌ | Не нужно для поиска |
| `imageUrl` | ✅ | ❌ | Не нужно для поиска |
| `fingerprint` | ✅ | ❌ | Не нужно для поиска |
| `authorAvatar` | ✅ | ❌ | Не нужно для поиска |

### Как работает синхронизация:

1. **Создание бита**:
   ```
   MongoDB (создание) → Elasticsearch (индексация)
   ```

2. **Поиск**:
   ```
   Elasticsearch (поиск) → Возвращает ID битов → MongoDB (полные данные)
   ```

3. **Обновление**:
   ```
   MongoDB (update) → Elasticsearch (update document)
   ```

4. **Удаление**:
   ```
   MongoDB (delete) → Elasticsearch (delete document)
   ```

### MongoDB Database: `beatmarket`

### Collection: `beats`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID бита |
| `title` | String | ✅ | Text Index | Название бита |
| `tags` | Array[String] | ✅ | Text Index | Теги (жанр, настроение) |
| `bpm` | Number | ✅ | - | Темп (ударов в минуту) |
| `price` | Number | ✅ | - | Цена ($) |
| `description` | String | ❌ | Text Index | Описание |
| `audioUrl` | String | ✅ | - | URL аудиофайла (MinIO) |
| `imageUrl` | String | ✅ | - | URL обложки (MinIO) |
| `fingerprint` | String | ❌ | Indexed | Аудиоотпечаток (Chromaprint) |
| `fingerprintStatus` | String | ❌ | - | "pending", "generated", "failed" |
| `authorId` | String | ✅ | Indexed | ID автора (user-service) |
| `authorName` | String | ✅ | - | Имя автора (денормализация) |
| `authorAvatar` | String | ❌ | - | Аватар автора (денормализация) |
| `rating` | Number | ❌ | - | Средний рейтинг (0-5) |
| `playCount` | Number | ❌ | - | Количество прослушиваний |
| `downloadUrl` | String | ❌ | - | URL для скачивания (после покупки) |
| `createdAt` | Date | ✅ | Indexed | Дата загрузки |
| `updatedAt` | Date | ✅ | - | Дата обновления |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.beats.createIndex({ authorId: 1 })
db.beats.createIndex({ createdAt: -1 })
db.beats.createIndex({ rating: -1 })
db.beats.createIndex({ title: "text", tags: "text", description: "text" })
db.beats.createIndex({ fingerprint: 1 })
```

### Пример документа:
```json
{
  "_id": ObjectId("861de9eb-bd68-41e2-ace1-1ab30271cf70"),
  "title": "APATHY 117 BPM F#MIN",
  "tags": ["trap", "dark", "hard"],
  "bpm": 117,
  "price": 25.00,
  "description": "Dark trap beat with heavy bass",
  "audioUrl": "beat-audio/861de9eb-bd68-41e2-ace1-1ab30271cf70.mp3",
  "imageUrl": "beat-images/861de9eb-bd68-41e2-ace1-1ab30271cf70.jpg",
  "fingerprint": "AQADtN...",
  "fingerprintStatus": "generated",
  "authorId": "69c90d6e23fdc613a7c90faf",
  "authorName": "Beat Producer",
  "authorAvatar": "avatars/69c90d6e23fdc613a7c90faf.jpg",
  "rating": 4.2,
  "playCount": 150,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "updatedAt": ISODate("2026-03-29T12:00:00Z")
}
```

### Elasticsearch Index: `beats`

**Назначение:** Только для поиска и фильтрации

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | Keyword | ID бита (для связи с MongoDB) |
| `title` | Text | Поиск по названию (full-text) |
| `tags` | Keyword | Фильтрация по тегам (exact match) |
| `bpm` | Integer | Поиск по темпу (range queries) |
| `price` | Float | Фильтрация по цене (range queries) |
| `authorName` | Text | Поиск по автору (full-text) |
| `rating` | Float | Сортировка по рейтингу |
| `createdAt` | Date | Сортировка по дате |
| `description` | Text | Поиск по описанию (full-text) |

**НЕ хранится в Elasticsearch:**
- `audioUrl` - не нужно для поиска
- `imageUrl` - не нужно для поиска
- `fingerprint` - служебное поле
- `authorAvatar` - не нужно для поиска

### Пример поиска:
```json
// Запрос: "dark trap beats under $30"
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "dark trap", "fields": ["title", "tags", "description"] } }
      ],
      "filter": [
        { "range": { "price": { "lte": 30 } } }
      ]
    }
  }
}

// Ответ: список ID битов
{
  "hits": {
    "hits": [
      { "_id": "861de9eb-bd68-41e2-ace1-1ab30271cf70", ... },
      { "_id": "3376e6ba-8167-4626-95bb-4d6689dae39e", ... }
    ]
  }
}

// Затем MongoDB: findByIds(["861de9eb...", "3376e6ba..."])
// Возвращает полные данные с audioUrl, imageUrl и т.д.
```

### Связи:
- `authorId` → user-service (MongoDB)
- `fingerprint` → проверка на плагиат (внутри сервиса)
- `rating` → агрегация из interaction-service

---

## 4. INTERACTION-SERVICE (MongoDB)

### Database: `beatmarket`

### Collection: `ratings`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID оценки |
| `beatId` | String | ✅ | Indexed | ID бита |
| `userId` | String | ✅ | Indexed | ID пользователя |
| `value` | Number | ✅ | - | Оценка (1-5) |
| `createdAt` | Date | ✅ | - | Дата оценки |
| `updatedAt` | Date | ✅ | - | Дата обновления |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.ratings.createIndex({ beatId: 1, userId: 1 }, { unique: true })
db.ratings.createIndex({ beatId: 1 })
```

### Пример документа:
```json
{
  "_id": ObjectId("abc123..."),
  "beatId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "userId": "69c90d6e23fdc613a7c90faf",
  "value": 5,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "updatedAt": ISODate("2026-03-29T10:00:00Z")
}
```

### Collection: `comments`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID комментария |
| `beatId` | String | ✅ | Indexed | ID бита |
| `userId` | String | ✅ | Indexed | ID автора комментария |
| `username` | String | ✅ | - | Имя автора (денормализация) |
| `text` | String | ✅ | - | Текст комментария |
| `createdAt` | Date | ✅ | Indexed | Дата создания |
| `updatedAt` | Date | ✅ | - | Дата обновления |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.comments.createIndex({ beatId: 1, createdAt: -1 })
db.comments.createIndex({ userId: 1 })
```

### Пример документа:
```json
{
  "_id": ObjectId("def456..."),
  "beatId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "userId": "69c90d6e23fdc613a7c90faf",
  "username": "Beat Producer",
  "text": "Fire beat! 🔥",
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "updatedAt": ISODate("2026-03-29T10:00:00Z")
}
```

### Collection: `reports`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID жалобы |
| `contentType` | String | ✅ | - | "beat", "comment", "user" |
| `contentId` | String | ✅ | Indexed | ID контента |
| `reporterId` | String | ✅ | Indexed | ID пожаловавшегося |
| `reportType` | String | ✅ | - | "plagiarism", "offensive", "spam" |
| `reason` | String | ✅ | - | Причина жалобы |
| `status` | String | ✅ | Indexed | "pending", "reviewed", "resolved", "rejected" |
| `assignedTo` | String | ❌ | Indexed | ID менеджера |
| `resolutionNote` | String | ❌ | - | Комментарий менеджера |
| `createdAt` | Date | ✅ | Indexed | Дата создания |
| `resolvedAt` | Date | ❌ | - | Дата решения |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.reports.createIndex({ status: 1, createdAt: -1 })
db.reports.createIndex({ assignedTo: 1 })
```

### Связи:
- `contentId` → beat-service (Elasticsearch) / interaction-service (MongoDB) / user-service (MongoDB)
- `reporterId` → user-service (MongoDB)
- `assignedTo` → user-service (MongoDB, роль "manager")
### Связи:
- `contentId` → beat-service (Elasticsearch) / interaction-service (MongoDB) / user-service (MongoDB)
- `reporterId` → user-service (MongoDB)
- `assignedTo` → user-service (MongoDB, роль "manager")
### Связи:
- `contentId` → beat-service (Elasticsearch) / interaction-service (MongoDB) / user-service (MongoDB)
- `reporterId` → user-service (MongoDB)
- `assignedTo` → user-service (MongoDB, роль "manager")

---

## 5. ORDER-SERVICE (MongoDB)

### Database: `beatmarket`

### Collection: `orders`

| Поле | Тип | Обязательное | Индекс | Описание |
|------|-----|--------------|--------|----------|
| `_id` | ObjectId | ✅ | Primary Key | Уникальный ID заказа |
| `beatId` | String | ✅ | Indexed | ID купленного бита |
| `buyerId` | String | ✅ | Indexed | ID покупателя |
| `sellerId` | String | ✅ | Indexed | ID продавца |
| `price` | Number | ✅ | - | Цена покупки ($) |
| `licenseType` | String | ✅ | - | Тип лицензии ("mp3", "wav", "exclusive") |
| `status` | String | ✅ | Indexed | "completed", "refunded" |
| `createdAt` | Date | ✅ | Indexed | Дата покупки |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```javascript
db.orders.createIndex({ buyerId: 1, createdAt: -1 })
db.orders.createIndex({ sellerId: 1, createdAt: -1 })
db.orders.createIndex({ beatId: 1 })
```

### Пример документа:
```json
{
  "_id": ObjectId("ghi789..."),
  "beatId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "buyerId": "69c90d6e23fdc613a7c90faf",
  "sellerId": "69c44daf935208569b8e2a26",
  "price": 25.00,
  "licenseType": "mp3",
  "status": "completed",
  "createdAt": ISODate("2026-03-29T10:00:00Z")
}
```

### Связи:
- `beatId` → beat-service (MongoDB)
- `buyerId`, `sellerId` → user-service (MongoDB)
- `price` → wallet-service (PostgreSQL) для транзакции

---

## 6. WALLET-SERVICE (PostgreSQL)

### Database: `wallet_db`

### Table: `wallets`

| Column | Type | Nullable | Index | Description |
|--------|------|----------|-------|-------------|
| `id` | UUID | ❌ | PRIMARY KEY | Уникальный ID кошелька |
| `user_id` | VARCHAR(24) | ❌ | UNIQUE, INDEX | ID пользователя |
| `balance` | DECIMAL(10,2) | ❌ | - | Баланс ($) |
| `created_at` | TIMESTAMP | ❌ | - | Дата создания |
| `updated_at` | TIMESTAMP | ❌ | - | Дата обновления |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```sql
CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_balance ON wallets(balance);
```

### Пример записи:
```sql
INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
VALUES (
  '7d213ed7-dc14-4c88-983e-0abe1b427953',
  '69c90d6e23fdc613a7c90faf',
  150.00,
  NOW(),
  NOW()
);
```

### Table: `transactions`

| Column | Type | Nullable | Index | Description |
|--------|------|----------|-------|-------------|
| `id` | UUID | ❌ | PRIMARY KEY | Уникальный ID транзакции |
| `wallet_id` | UUID | ❌ | INDEX | ID кошелька |
| `type` | VARCHAR(20) | ❌ | INDEX | "credit" или "debit" |
| `amount` | DECIMAL(10,2) | ❌ | - | Сумма ($) |
| `description` | TEXT | ❌ | - | Описание |
| `reference_id` | VARCHAR(50) | ❌ | INDEX | ID заказа (order-service) |
| `created_at` | TIMESTAMP | ❌ | INDEX | Дата транзакции |

### Пример документа:
```json
{
  "_id": ObjectId("rep789..."),
  "contentType": "beat",
  "contentId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
  "reporterId": "69c90d6e23fdc613a7c90faf",
  "reportType": "plagiarism",
  "reason": "This beat uses my melody without permission",
  "status": "pending",
  "assignedTo": null,
  "resolutionNote": null,
  "createdAt": ISODate("2026-03-29T10:00:00Z"),
  "resolvedAt": null
}
```

### Индексы:
```sql
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

### Пример записи:
```sql
INSERT INTO transactions (id, wallet_id, type, amount, description, reference_id, created_at)
VALUES (
  'abc123...',
  '7d213ed7-dc14-4c88-983e-0abe1b427953',
  'debit',
  25.00,
  'Purchase: APATHY 117 BPM F#MIN',
  'ghi789...',
  NOW()
);
```

### Связи:
- `user_id` → user-service (MongoDB)
- `reference_id` → order-service (MongoDB)

---

## 7. ANALYTICS-SERVICE (ClickHouse)

### Database: `analytics`

### Table: `beat_events`

**Реализовано:** ✅ ДА

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `timestamp` | DateTime | ❌ | Время события |
| `event_type` | String | ❌ | Тип: "beat.viewed", "beat.rated", "order.created" |
| `beat_id` | String | ❌ | ID бита |
| `user_id` | String | ❌ | ID пользователя |
| `value` | Float64 | ❌ | Значение (например, рейтинг 1-5) |

### Движок:
```sql
CREATE TABLE beat_events (
  timestamp DateTime,
  event_type String,
  beat_id String,
  user_id String,
  value Float64
) ENGINE = MergeTree()
ORDER BY (event_type, timestamp);
```

### Примеры записей:
```sql
-- Просмотр бита
INSERT INTO beat_events 
VALUES (now(), 'beat.viewed', '861de9eb...', '69c90d6e...', 0);

-- Оценка бита (5 звёзд)
INSERT INTO beat_events 
VALUES (now(), 'beat.rated', '861de9eb...', '69c90d6e...', 5);

-- Покупка бита
INSERT INTO beat_events 
VALUES (now(), 'order.created', '861de9eb...', '69c90d6e...', 25.00);
```

### Запросы:
```sql
-- Статистика по биту
SELECT
  countIf(event_type = 'beat.viewed') as views,
  countIf(event_type = 'order.created') as sales,
  avgIf(value, event_type = 'beat.rated') as avg_rating
FROM beat_events
WHERE beat_id = '861de9eb...';

-- Топ битов по просмотрам за неделю
SELECT beat_id, count() as views
FROM beat_events
WHERE event_type = 'beat.viewed'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY beat_id
ORDER BY views DESC
LIMIT 10;
```

### НЕ реализовано (запланировано):
- ❌ `beat_views` - отдельной таблицы нет (используется `beat_events`)
- ❌ `beat_purchases` - отдельной таблицы нет (используется `beat_events`)

### Связи:
- `beat_id` → beat-service (MongoDB)
- `user_id` → user-service (MongoDB)

---

## 📊 СВЯЗИ МЕЖДУ СЕРВИСАМИ

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Nginx)                      │
│                        Port: 8000                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ auth-service │    │ user-service │    │ beat-service │
│   (Redis)    │◄──►│  (MongoDB)   │◄──►│(MongoDB + ES)│
└──────────────┘    └──────────────┘    └──────────────┘
                           │                     │
                    ┌──────┴──────┐              │
                    │             │              │
                    ▼             ▼              ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │interaction-  │ │ order-service│ │ wallet-      │
           │service       │ │  (MongoDB)   │ │ service      │
           │(MongoDB)     │ └──────────────┘ │(PostgreSQL)  │
           └──────────────┘         │        └──────────────┘
                    │               │              │
                    └───────────────┴──────────────┘
                                    │
                                    ▼
                          ┌──────────────┐
                          │ analytics-   │
                          │ service      │
                          │ (ClickHouse) │
                          └──────────────┘
```

### Ключевые связи:

| От | К | Тип связи | Поле |
|----|---|-----------|------|
| auth-service | user-service | JWT → MongoDB | `userId` |
| beat-service | user-service | MongoDB → MongoDB | `authorId` |
| interaction-service | beat-service | MongoDB → MongoDB | `beatId` |
| interaction-service | user-service | MongoDB → MongoDB | `userId` |
| order-service | beat-service | MongoDB → MongoDB | `beatId` |
| order-service | user-service | MongoDB → MongoDB | `buyerId`, `sellerId` |
| order-service | wallet-service | MongoDB → PostgreSQL | `reference_id` |
| wallet-service | user-service | PostgreSQL → MongoDB | `user_id` |
| analytics-service | Все сервисы | ClickHouse ← Kafka | События |

---

## 🔄 KAFKA TOPICS (События)

| Topic | Producer | Consumer | Описание |
|-------|----------|----------|----------|
| `user_registered` | user-service | analytics-service | Новый пользователь |
| `beat_created` | beat-service | analytics-service | Новый бит |
| `beat_deleted` | beat-service | analytics-service | Бит удалён |
| `beat_rated` | interaction-service | analytics-service | Оценка бита |
| `comment_added` | interaction-service | analytics-service | Новый комментарий |
| `beat_purchased` | order-service | analytics-service, wallet-service | Покупка бита |

### Пример события:
```json
{
  "type": "beat_purchased",
  "timestamp": "2026-03-29T10:00:00Z",
  "data": {
    "beatId": "861de9eb-bd68-41e2-ace1-1ab30271cf70",
    "buyerId": "69c90d6e23fdc613a7c90faf",
    "sellerId": "69c44daf935208569b8e2a26",
    "price": 25.00,
    "licenseType": "mp3"
  }
}
```

---

## 📈 ER-ДИАГРАММА (Упрощённая)

```
users (MongoDB)
  │
  ├─1:N─→ beats (MongoDB)
  │        │
  │        ├─1:N─→ ratings (MongoDB)
  │        │        └─N:1─→ users
  │        │
  │        ├─1:N─→ comments (MongoDB)
  │        │        └─N:1─→ users
  │        │
  │        └─1:N─→ orders (MongoDB)
  │                 ├─N:1─→ users (buyer)
  │                 └─N:1─→ users (seller)
  │
  └─1:1─→ wallets (PostgreSQL)
           │
           └─1:N─→ transactions (PostgreSQL)
                    │
                    └─N:1─→ orders (reference)
```

---

**Файл создан:** 2026-03-29  
**Версия:** 1.0
