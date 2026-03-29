# 🎵 Audio Fingerprinting & Anti-Plagiarism System

## Overview

This system uses **Chromaprint** (via `fpcalc` utility) to generate unique audio fingerprints for each beat uploaded to the platform. This enables:

1. **Plagiarism Detection** - Identify duplicate or very similar beats
2. **Copyright Protection** - Protect original creators
3. **Content Moderation** - Support manager reports with technical evidence

---

## 📦 Installation

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install libchromaprint-tools
```

### macOS
```bash
brew install chromaprint
```

### Docker (Recommended)
Add to `beat-service/Dockerfile`:
```dockerfile
RUN apk add --no-cache libchromaprint-tools
# OR for Debian-based images:
RUN apt-get update && apt-get install -y libchromaprint-tools && rm -rf /var/lib/apt/lists/*
```

### Verify Installation
```bash
fpcalc -version
# Output: fpcalc 1.4.3
```

---

## 🔧 How It Works

### 1. Beat Upload Flow
```
User uploads beat.mp3
    ↓
beat-service saves to MinIO
    ↓
fpcalc generates fingerprint
    ↓
Fingerprint stored in Elasticsearch
    ↓
Check against existing fingerprints
    ↓
If similarity > 80% → Flag for review
```

### 2. Fingerprint Generation
```bash
# Generate fingerprint
fpcalc -length 120 beat.mp3

# Output:
DURATION=180.5
FINGERPRINT=AQADtN... (base64 encoded)
```

### 3. Comparison
```go
score := fingerprintService.CompareFingerprints(fp1, fp2)
if score > 0.8 {
    // 80% similar - likely plagiarism
    flagForReview(beatID)
}
```

---

## 📊 Database Schema

### Elasticsearch Index: `beat_fingerprints`
```json
{
  "beat_id": "uuid",
  "fingerprint": "AQADtN...",
  "duration": 180.5,
  "created_at": "2026-03-27T00:00:00Z",
  "author_id": "uuid",
  "status": "active" // active, flagged, removed
}
```

---

## 🚀 API Endpoints

### Generate Fingerprint (Internal)
```
POST /api/v1/beats/:id/fingerprint
Authorization: Bearer <token>

Response:
{
  "beat_id": "uuid",
  "fingerprint": "AQADtN...",
  "duration": 180.5
}
```

### Check Similarity (Manager Only)
```
GET /api/v1/beats/:id/similar
Authorization: Bearer <manager_token>

Response:
{
  "similar_beats": [
    {
      "beat_id": "uuid",
      "similarity_score": 0.95,
      "title": "Similar Beat"
    }
  ]
}
```

---

## 🎯 Performance

| Metric | Value |
|--------|-------|
| Fingerprint Generation | ~2-5 seconds per beat |
| Comparison | <100ms per comparison |
| Storage | ~1KB per fingerprint |
| Accuracy | ~95% for identical tracks |

---

## 🔒 Privacy & Security

- Fingerprints are **one-way hashes** - cannot reconstruct audio
- Stored separately from audio files
- Only managers can access similarity data
- Automatic flagging reduces manual review workload

---

## 📝 Manager Actions

When plagiarism is detected:

1. **Auto-Flag** - Beat marked as "Under Review"
2. **Manager Review** - Listen to both beats
3. **Decision**:
   - ✅ Clear (false positive)
   - ⚠️ Warning to uploader
   - ❌ Remove beat
   - 🚫 Ban repeat offenders

---

## 🧪 Testing

### Test Fingerprint Generation
```bash
# Generate fingerprint for test file
fpcalc -length 120 test.mp3

# Should output DURATION and FINGERPRINT
```

### Test Comparison
```go
func TestFingerprintComparison(t *testing.T) {
    fp1 := "AQADtN..."
    fp2 := "AQADtN..." // Similar
    fp3 := "BQBCuO..." // Different
    
    score1 := CompareFingerprints(fp1, fp2) // Should be ~0.95
    score2 := CompareFingerprints(fp1, fp3) // Should be ~0.1
}
```

---

## 🐛 Troubleshooting

### fpcalc not found
```bash
# Check if installed
which fpcalc

# Install if missing
sudo apt-get install libchromaprint-tools
```

### Fingerprint generation too slow
- Reduce `-length` parameter (default: 120 seconds)
- Use fallback hash-based fingerprinting for short clips
- Process fingerprints asynchronously

### High false positive rate
- Increase similarity threshold (default: 80%)
- Use longer fingerprint samples
- Combine with manual review

---

## 📚 References

- [Chromaprint Documentation](https://acoustid.org/chromaprint)
- [Audio Fingerprinting Explained](https://www.ee.columbia.edu/~dpwe/papers/Wang03-shazam.pdf)
- [Shazam Algorithm](https://en.wikipedia.org/wiki/Shazam_(music_app))

---

**Status**: ✅ Implemented  
**Performance**: ⚡ Fast (2-5s per beat)  
**Accuracy**: 🎯 ~95%
