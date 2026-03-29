# 🎵 TEST DATA & ACCOUNTS

## 👤 Test Accounts Created

### 1. Producer (Битмейкер)
```
Email: producer@beatmarket.com
Password: producer123
Role: user
```
**Has**: 6 beats for sale

### 2. Buyer (Покупатель)
```
Email: buyer@beatmarket.com
Password: buyer123
Role: user
```
**Has**: Purchased 3 beats from producer

### 3. Manager (Модератор)
```
Email: manager@beatmarket.com
Password: manager123
Role: manager
```
**Has**: Admin permissions, receives 3% commission

---

## 🎵 Beats Created

| # | Title | Tags | BPM | Price |
|---|-------|------|-----|-------|
| 1 | Chill Lo-Fi Study Beat | lofi, chill, study | 80 | $15 |
| 2 | Epic Trap Anthem | trap, hiphop, hard | 140 | $25 |
| 3 | Smooth R&B Groove | rnb, soul, smooth | 95 | $20 |
| 4 | Energetic EDM Banger | edm, dance, electronic | 128 | $30 |
| 5 | Melodic Hip Hop | hiphop, melodic, emotional | 90 | $22 |
| 6 | Ambient Soundscape | ambient, atmospheric | 70 | $18 |

---

## 📊 Statistics to Check

### Producer Profile:
- ✅ 6 beats uploaded
- ✅ 3 beats sold
- ✅ Total revenue: $57 (from 3 sales)
- ✅ Commission paid: $1.71 (3%)
- ✅ Net earnings: $55.29

### Buyer Profile:
- ✅ 3 beats purchased
- ✅ Total spent: $57

### Manager Dashboard:
- ✅ Commission received: $1.71
- ✅ Total transactions: 3

---

## 🧪 How to Test

### 1. Login as Producer
```
Open app → Login
Email: producer@beatmarket.com
Password: producer123
```

**Check**:
- Go to Profile → See "My Beats" (6 beats)
- Check Stats → See "Sales: 3", "Revenue: $57"

### 2. Login as Buyer
```
Open app → Login
Email: buyer@beatmarket.com
Password: buyer123
```

**Check**:
- Go to Profile → See "Purchased Beats" (3 beats)
- Can play downloaded beats

### 3. Login as Manager
```
Open app → Login
Email: manager@beatmarket.com
Password: manager123
```

**Check**:
- Access Manager Dashboard
- View all reports
- See commission statistics

---

## 🔄 Reseed Data

If you need to reset test data:

```bash
# Stop services
docker-compose down

# Clear databases (optional)
docker volume rm diploma-gornative_mongo_data
docker volume rm diploma-gornative_postgres_data

# Start services
./scripts/start-services.sh

# Seed test data
./scripts/seed-data.sh
```

---

## 📱 Quick Test Flow

1. **Login as Producer** → Upload a new beat
2. **Logout** → Login as Buyer
3. **Browse beats** → See producer's beats
4. **Purchase a beat** → Complete transaction
5. **Logout** → Login as Manager
6. **Check dashboard** → See commission from sale

---

## 🎯 What This Tests

- ✅ User registration & login
- ✅ Beat upload (with tags, no genre)
- ✅ Beat browsing
- ✅ Beat purchase flow
- ✅ Payment & commission
- ✅ Statistics tracking
- ✅ Manager permissions
- ✅ Multi-user interactions

---

**Status**: ✅ Ready for Testing  
**Last Updated**: 2026-03-29
