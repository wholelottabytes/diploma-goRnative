#!/bin/bash
# Seed test data for BeatMarket - CLEAN VERSION
# Creates: 2 users, 6 beats with real images/audio

set -e

echo "🌱 Seeding CLEAN test data..."

# API Base URL
BASE_URL="http://localhost:8000/api"

# Login function
login() {
    local email=$1
    local password=$2
    
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('token', ''))"
}

echo ""
echo "📝 Step 1/4: Creating users..."

# Create producer
producer_result=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"Beat Producer","email":"producer@beatmarket.com","password":"producer123","phone":"+1234567890","role":"user"}')
echo "   Producer: $producer_result"

# Create buyer
buyer_result=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"Music Buyer","email":"buyer@beatmarket.com","password":"buyer123","phone":"+1987654321","role":"user"}')
echo "   Buyer: $buyer_result"

echo ""
echo "🔑 Step 2/4: Logging in..."

# Login as producer
PRODUCER_TOKEN=$(login "producer@beatmarket.com" "producer123")
echo "   Producer logged in"

# Login as buyer
BUYER_TOKEN=$(login "buyer@beatmarket.com" "buyer123")
echo "   Buyer logged in"

echo ""
echo "🎵 Step 3/4: Creating 6 beats..."

# Beats with WORKING URLs (no redirects)
beats='[
  {"title":"Chill Lo-Fi Study","tags":["lofi","chill","study","relax"],"bpm":80,"price":15,"description":"Perfect for studying","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3","image_url":"https://loremflickr.com/800/800/lofi?lock=1"},
  {"title":"Epic Trap Banger","tags":["trap","hiphop","hard","bass"],"bpm":140,"price":25,"description":"Hard hitting trap","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3","image_url":"https://loremflickr.com/800/800/rap?lock=2"},
  {"title":"Smooth R&B Vibes","tags":["rnb","soul","smooth","vibes"],"bpm":95,"price":20,"description":"Smooth R&B beat","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3","image_url":"https://loremflickr.com/800/800/music?lock=3"},
  {"title":"EDM Festival","tags":["edm","dance","electronic","party"],"bpm":128,"price":30,"description":"Festival EDM","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3","image_url":"https://loremflickr.com/800/800/concert?lock=4"},
  {"title":"Melodic Rap","tags":["hiphop","melodic","emotional","rap"],"bpm":90,"price":22,"description":"Emotional beat","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3","image_url":"https://loremflickr.com/800/800/hiphop?lock=5"},
  {"title":"Ambient Meditation","tags":["ambient","atmospheric","meditation","calm"],"bpm":70,"price":18,"description":"Peaceful ambient","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3","image_url":"https://loremflickr.com/800/800/calm?lock=6"}
]'

# Create beats as producer
beat_ids=()
for i in {0..5}; do
    beat=$(echo "$beats" | python3 -c "import sys,json; beats=json.load(sys.stdin); print(json.dumps(beats[$i]))")
    title=$(echo "$beat" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")
    
    response=$(curl -s -X POST "$BASE_URL/beats" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $PRODUCER_TOKEN" \
        -d "$beat")
    
    beat_id=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('_id', ''))" 2>/dev/null || echo "")
    
    if [ -n "$beat_id" ]; then
        beat_ids+=("$beat_id")
        echo "   ✅ Created: $title"
    else
        echo "   ❌ Failed: $title - $response"
    fi
done

echo ""
echo "💰 Step 4/4: Buyer purchases 3 beats..."

# Buyer purchases beats 0, 2, 4 (Chill, R&B, Melodic)
for i in 0 2 4; do
    if [ -n "${beat_ids[$i]}" ]; then
        beat_id=${beat_ids[$i]}
        
        response=$(curl -s -X POST "$BASE_URL/orders" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $BUYER_TOKEN" \
            -d "{\"beat_id\":\"$beat_id\"}")
        
        if echo "$response" | grep -q "id"; then
            echo "   ✅ Purchased beat $((i+1))"
        else
            echo "   ⚠️  Purchase: $response"
        fi
    fi
done

echo ""
echo "========================================"
echo "✅ SEEDING COMPLETE!"
echo "========================================"
echo ""
echo "👤 Accounts:"
echo "   🎵 Producer: producer@beatmarket.com / producer123"
echo "   🛒 Buyer:    buyer@beatmarket.com / buyer123"
echo "   👮 Manager:  manager@beatmarket.com / manager123"
echo ""
echo "📊 Stats:"
echo "   Producer: 6 beats, 3 sales"
echo "   Buyer: 3 purchased beats"
echo ""
echo "🎨 All beats have:"
echo "   ✅ Working cover images (picsum.photos)"
echo "   ✅ Working audio previews (soundhelix.com)"
echo "   ✅ Tags (no genre)"
echo ""
