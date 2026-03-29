#!/bin/bash
# Seed test data for BeatMarket
# Creates: 2 users, 6 beats, and purchase transactions

set -e

echo "🌱 Seeding test data..."

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

# Create user function
create_user() {
    local name=$1
    local email=$2
    local password=$3
    local phone=$4
    
    response=$(curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"$password\",\"phone\":\"$phone\",\"role\":\"user\"}")
    
    echo "$response"
}

echo ""
echo "📝 Step 1/4: Creating users..."

# Create producer
producer_result=$(create_user "Beat Producer" "producer@beatmarket.com" "producer123" "+1234567890")
echo "   Producer: $producer_result"

# Create buyer
buyer_result=$(create_user "Music Buyer" "buyer@beatmarket.com" "buyer123" "+1987654321")
echo "   Buyer: $buyer_result"

echo ""
echo "🔑 Step 2/4: Logging in..."

# Login as producer
PRODUCER_TOKEN=$(login "producer@beatmarket.com" "producer123")
echo "   Producer token: ${PRODUCER_TOKEN:0:20}..."

# Login as buyer
BUYER_TOKEN=$(login "buyer@beatmarket.com" "buyer123")
echo "   Buyer token: ${BUYER_TOKEN:0:20}..."

echo ""
echo "🎵 Step 3/4: Creating beats..."

# Read beats from JSON
beats='[
  {"title":"Chill Lo-Fi Study Beat","tags":["lofi","chill","study"],"bpm":80,"price":15.00,"description":"Perfect for studying","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3","image_url":"https://picsum.photos/seed/beat1/800/800.jpg"},
  {"title":"Epic Trap Anthem","tags":["trap","hiphop","hard"],"bpm":140,"price":25.00,"description":"Hard hitting trap","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3","image_url":"https://picsum.photos/seed/beat2/800/800.jpg"},
  {"title":"Smooth R&B Groove","tags":["rnb","soul","smooth"],"bpm":95,"price":20.00,"description":"Smooth R&B","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3","image_url":"https://picsum.photos/seed/beat3/800/800.jpg"},
  {"title":"Energetic EDM Banger","tags":["edm","dance","electronic"],"bpm":128,"price":30.00,"description":"High energy EDM","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3","image_url":"https://picsum.photos/seed/beat4/800/800.jpg"},
  {"title":"Melodic Hip Hop","tags":["hiphop","melodic","emotional"],"bpm":90,"price":22.00,"description":"Emotional hip hop","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3","image_url":"https://picsum.photos/seed/beat5/800/800.jpg"},
  {"title":"Ambient Soundscape","tags":["ambient","atmospheric","meditation"],"bpm":70,"price":18.00,"description":"Peaceful ambient","audio_url":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3","image_url":"https://picsum.photos/seed/beat6/800/800.jpg"}
]'

# Create beats as producer
beat_ids=()
for i in {0..5}; do
    beat=$(echo "$beats" | python3 -c "import sys,json; beats=json.load(sys.stdin); print(json.dumps(beats[$i]))")
    
    response=$(curl -s -X POST "$BASE_URL/beats" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $PRODUCER_TOKEN" \
        -d "$beat")
    
    beat_id=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('_id', ''))" 2>/dev/null || echo "")
    
    if [ -n "$beat_id" ]; then
        beat_ids+=("$beat_id")
        echo "   ✅ Created beat: $(echo "$beat" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")"
    else
        echo "   ❌ Failed to create beat $i"
    fi
done

echo ""
echo "💰 Step 4/4: Creating purchases (buyer buys beats from producer)..."

# Buyer purchases 3 beats from producer
for i in 0 2 4; do
    if [ -n "${beat_ids[$i]}" ]; then
        beat_id=${beat_ids[$i]}
        
        response=$(curl -s -X POST "$BASE_URL/orders" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $BUYER_TOKEN" \
            -d "{\"beat_id\":\"$beat_id\"}")
        
        order_id=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('id', ''))" 2>/dev/null || echo "")
        
        if [ -n "$order_id" ]; then
            echo "   ✅ Purchased beat: $beat_id"
        else
            echo "   ⚠️  Purchase response: $response"
        fi
    fi
done

echo ""
echo "========================================"
echo "✅ Seeding complete!"
echo "========================================"
echo ""
echo "👤 Test Accounts:"
echo "   Producer: producer@beatmarket.com / producer123"
echo "   Buyer:    buyer@beatmarket.com / buyer123"
echo "   Manager:  manager@beatmarket.com / manager123"
echo ""
echo "📊 Statistics:"
echo "   Producer has: 6 beats, 3 sales"
echo "   Buyer has: 3 purchased beats"
echo ""
echo "🎵 Login to app and check:"
echo "   1. Producer profile → See beats & sales stats"
echo "   2. Buyer profile → See purchased beats"
echo ""
