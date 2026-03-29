# 📁 Seed Data Folder

## Как использовать

### 1. Добавление битов

Помести файлы битов в папку `seed/beats/`:
- **Аудио файлы**: `.mp3`, `.wav`, `.flac`
- **Изображения**: `.jpg`, `.png` (опционально, должно иметь то же имя что и аудио)

**Пример**:
```
seed/beats/
├── chill_beat.mp3
├── chill_beat.jpg       # Обложка (опционально)
├── trap_anthem.mp3
└── trap_anthem.png      # Обложка (опционально)
```

### 2. Метаданные (опционально)

Создай JSON файл с метаданными для каждого бита:
```json
{
  "title": "Chill Beat",
  "tags": ["chill", "lofi", "relax"],
  "bpm": 80,
  "price": 15.00,
  "description": "Relaxing beat for studying"
}
```

**Пример структуры**:
```
seed/beats/
├── chill_beat.mp3
├── chill_beat.jpg
└── chill_beat.json      # Метаданные (опционально)
```

### 3. Автоматическое добавление

При каждом запуске сервисов:
1. Скрипт проверяет папку `seed/beats/`
2. Находит все аудио файлы
3. Проверяет, есть ли уже бит с таким именем
4. Если нет - создает новый бит
5. Генерирует fingerprint автоматически

---

## 🛡️ Manager Account

Менеджерский аккаунт создается автоматически при первом запуске.

**Credentials**:
```
Email: manager@beatmarket.com
Password: manager123
Role: manager
```

**Возможности менеджера**:
- ✅ Просматривать все жалобы
- ✅ Удалять биты (плагиат, нарушения)
- ✅ Удалять комментарии (оскорбления, спам)
- ✅ Блокировать пользователей
- ✅ Получать комиссию с транзакций (3%)
- ✅ Просматривать статистику

---

## 🔄 При каждом запуске

```bash
./scripts/start-services.sh
```

**Происходит**:
1. ✅ Стартуют все сервисы по порядку
2. ✅ Проверяется health каждого сервиса
3. ✅ Загружаются биты из `seed/beats/`
4. ✅ Создается менеджерский аккаунт (если нет)
5. ✅ Генерируются fingerprint для битов

---

## 📝 Примеры seed данных

### chill_beat.json
```json
{
  "title": "Chill Vibes",
  "tags": ["chill", "lofi", "study", "relax"],
  "bpm": 80,
  "price": 15.00,
  "description": "Perfect beat for studying and relaxation"
}
```

### manager.json (в seed/users/)
```json
{
  "name": "Moderator",
  "email": "manager@beatmarket.com",
  "password": "manager123",
  "role": "manager",
  "phone": "+1234567890"
}
```

---

**Status**: ✅ Ready  
**Auto-load**: On every service startup
