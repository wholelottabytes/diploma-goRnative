# 📋 Seed Accounts

## Test Accounts

### Producer (already has producer role)
```
Email: producer@beatmarket.com
Password: producer123
Role: producer
```

### Buyer (regular user)
```
Email: buyer@beatmarket.com
Password: buyer123
Role: user
```

### Manager (moderator)
```
Email: manager@beatmarket.com
Password: manager123
Role: manager
```

### Default User (from seeding)
```
Email: user@example.com
Password: password1
Role: user
```

---

## 🛡️ Anti-Plagiarism (AP) System

### How it works:
1. **Audio Fingerprinting** - Chromaprint generates unique fingerprint
2. **Fingerprint Storage** - Stored in Elasticsearch with beat metadata
3. **Similarity Check** - Before upload, compares with existing fingerprints
4. **Threshold** - >80% similarity = potential plagiarism

### Backend Implementation:
- `beat-service/internal/service/fingerprint/fingerprint.go`
- Uses `fpcalc` (Chromaprint) for fingerprint generation
- Compares fingerprints using string similarity

### API Endpoints:
```
POST /api/beats/upload-audio     # Upload audio, generates fingerprint
POST /api/beats                  # Create beat, checks for duplicates
GET  /api/beats/:id/similar      # Find similar beats (manager only)
```

### Status:
✅ Fingerprint generation works
✅ Fingerprint stored in DB
⏳ Automatic duplicate detection (needs implementation)

---

## 📊 Manager Features

### Reports System:
- ✅ Create report (user)
- ✅ View pending reports (manager)
- ✅ Approve/Reject reports (manager)
- ✅ Delete content (manager)
- ✅ Warn/Ban users (manager)

### Manager Dashboard:
- ✅ View statistics
- ✅ Review reports
- ✅ Moderate content

### Status:
✅ Backend API ready
✅ Frontend ManagerScreen created
⏳ Needs testing with real data

---

## 🎵 Add Beat Flow

### Current Flow:
1. User fills form (title, tags, price, etc.)
2. Uploads image → saved to MinIO
3. Uploads audio → saved to MinIO
4. Submits → beat created in DB

### Issue:
If user exits after upload but before submit:
- ❌ Image/audio remain in MinIO
- ❌ No beat in DB (orphaned files)

### Solution (TODO):
1. Upload to temp folder
2. Only move to permanent storage on submit
3. Clean up temp files after 24h

---

## ⭐ Rating System

### Backend:
```
POST /api/interactions/ratings
GET  /api/interactions/beats/:id/rating
GET  /api/interactions/beats/:id/rating/me
```

### Frontend:
- BeatDetailsScreen has star rating UI
- `handleRate()` function calls API
- Shows average rating

### Status:
✅ Backend endpoint exists
✅ Frontend UI exists
⏳ Needs testing
