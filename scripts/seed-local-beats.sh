#!/bin/bash
# Seed local beats from /seed/local folder
# Uploads via API as if user is adding manually

set -e

echo "🎵 Seeding local beats from /seed/local..."

SEED_DIR="/home/bns/diploma-goRnative/seed/local"
BASE_URL="http://localhost:8000/api"

# Login as producer
echo ""
echo "📝 Logging in as producer..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"producer@beatmarket.com","password":"producer123"}')

TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token', ''))")

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to login! Make sure producer account exists."
    exit 1
fi

echo "✅ Logged in successfully"

HEADERS="Authorization: Bearer $TOKEN"

# Get list of MP3 files (sorted)
mapfile -t MP3_FILES < <(find "$SEED_DIR" -name "*.mp3" -type f | sort)
mapfile -t JPG_FILES < <(find "$SEED_DIR" -name "*.jpg" -type f | sort)

echo ""
echo "📁 Found ${#MP3_FILES[@]} MP3 files and ${#JPG_FILES[@]} JPG files"

# Counter for images
img_index=0

# Upload each beat
for mp3_file in "${MP3_FILES[@]}"; do
    filename=$(basename "$mp3_file" .mp3)
    
    echo ""
    echo "🎵 Uploading: $filename"
    
    # Extract BPM and key from filename if available
    bpm=$(echo "$filename" | grep -oP '\d+\s*BPM' | grep -oP '\d+' | head -1)
    key=$(echo "$filename" | grep -oP '[A-G]#?[Mm]?[Ii]?[Nn]?' | head -1)
    
    # Default values
    [ -z "$bpm" ] && bpm="120"
    [ -z "$key" ] && key="C min"
    
    # Find matching image (cycle through available images)
    if [ ${#JPG_FILES[@]} -gt 0 ]; then
        image_file="${JPG_FILES[$img_index % ${#JPG_FILES[@]}]}"
        img_index=$((img_index + 1))
    else
        image_file=""
    fi
    
    echo "   BPM: $bpm, Key: $key"
    
    # Step 1: Upload image
    if [ -n "$image_file" ] && [ -f "$image_file" ]; then
        echo "   📸 Uploading image..."
        image_resp=$(curl -s -X POST "$BASE_URL/beats/upload-image" \
            -H "$HEADERS" \
            -F "file=@\"$image_file\"")
        
        image_url=$(echo "$image_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('objectName', ''))" 2>/dev/null || echo "")
        echo "   ✅ Image uploaded: $image_url"
    else
        # Use placeholder if no image
        image_url="https://loremflickr.com/800/800/music?lock=$RANDOM"
        echo "   ⚠️  Using placeholder image"
    fi
    
    # Step 2: Upload audio
    echo "   🎵 Uploading audio..."
    audio_resp=$(curl -s -X POST "$BASE_URL/beats/upload-audio" \
        -H "$HEADERS" \
        -F "file=@\"$mp3_file\"")
    
    audio_url=$(echo "$audio_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('objectName', ''))" 2>/dev/null || echo "")
    
    if [ -z "$audio_url" ]; then
        echo "   ❌ Failed to upload audio!"
        continue
    fi
    
    echo "   ✅ Audio uploaded: $audio_url"
    
    # Step 3: Create beat
    echo "   📝 Creating beat..."
    
    # Generate tags from filename
    tags="[\"$(echo "$filename" | cut -d' ' -f1 | tr '[:upper:]' '[:lower:]')\", \"original\", \"beat\"]"
    
    beat_data="{
        \"title\": \"$filename\",
        \"tags\": $tags,
        \"bpm\": $bpm,
        \"price\": 25.00,
        \"description\": \"Original beat: $filename (Key: $key)\",
        \"audio_url\": \"$audio_url\",
        \"image_url\": \"$image_url\"
    }"
    
    create_resp=$(curl -s -X POST "$BASE_URL/beats" \
        -H "$HEADERS" \
        -H "Content-Type: application/json" \
        -d "$beat_data")
    
    beat_id=$(echo "$create_resp" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('_id', ''))" 2>/dev/null || echo "")
    
    if [ -n "$beat_id" ]; then
        echo "   ✅ Beat created: $beat_id"
    else
        echo "   ❌ Failed to create beat: $create_resp"
    fi
done

echo ""
echo "========================================"
echo "✅ SEEDING COMPLETE!"
echo "========================================"
echo ""
echo "🎵 Beats uploaded: ${#MP3_FILES[@]}"
echo ""
echo "👤 Login to app as:"
echo "   Producer: producer@beatmarket.com / producer123"
echo ""
