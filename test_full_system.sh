#!/bin/bash

# Comprehensive test script for the Beat Marketplace ecosystem.
# This script covers:
# 1. User/Seller management (Register/Login)
# 2. Beat management (Create/List)
# 3. Wallet operations (Check Balance/Top Up)
# 4. Interactions (Comment/Rate)
# 5. Order management (Purchase)

set -e

API_GATEWAY="http://localhost:8000"
TS=$(date +%s)
SELLER_EMAIL="seller_$TS@example.com"
BUYER_EMAIL="buyer_$TS@example.com"
PASSWORD="Password123!"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log() {
    echo -e "${BLUE}>>> $1${NC}"
}

function success() {
    echo -e "${GREEN}✔ $1${NC}"
}

# --- STEP 1: Register Seller ---
log "Registering seller..."
SELLER_SIGNUP=$(curl -s -X POST $API_GATEWAY/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Seller",
    "email": "'"$SELLER_EMAIL"'",
    "password": "'"$PASSWORD"'",
    "phone": "+1234567891",
    "role": "seller"
  }')
SELLER_ID=$(echo $SELLER_SIGNUP | jq -r '.id')
log "Seller registered with ID: $SELLER_ID"

# --- STEP 2: Login Seller to get Token ---
log "Logging in seller..."
SELLER_LOGIN=$(curl -s -X POST $API_GATEWAY/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$SELLER_EMAIL"'", "password": "'"$PASSWORD"'"}')
SELLER_TOKEN=$(echo $SELLER_LOGIN | jq -r '.token')
success "Seller token obtained."

# --- STEP 3: Seller Creates a Beat ---
log "Creating a beat..."
CREATE_BEAT_RESP=$(curl -s -X POST $API_GATEWAY/api/beats \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hyperdrive",
    "price": 25.00,
    "tags": ["trap", "fast"],
    "audioUrl": "http://minio:9000/beats/hyperdrive.mp3",
    "imageUrl": "http://minio:9000/images/hyperdrive.jpg"
  }')
BEAT_ID=$(echo $CREATE_BEAT_RESP | jq -r '.id')
success "Beat created with ID: $BEAT_ID"

# --- STEP 4: Register Buyer ---
log "Registering buyer..."
BUYER_SIGNUP=$(curl -s -X POST $API_GATEWAY/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Buyer",
    "email": "'"$BUYER_EMAIL"'",
    "password": "'"$PASSWORD"'",
    "phone": "+1234567892",
    "role": "buyer"
  }')
BUYER_ID=$(echo $BUYER_SIGNUP | jq -r '.id')
log "Buyer registered with ID: $BUYER_ID"

# --- STEP 5: Login Buyer ---
log "Logging in buyer..."
BUYER_LOGIN=$(curl -s -X POST $API_GATEWAY/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$BUYER_EMAIL"'", "password": "'"$PASSWORD"'"}')
BUYER_TOKEN=$(echo $BUYER_LOGIN | jq -r '.token')
success "Buyer token obtained."

# --- STEP 6: Check Buyer Initial Balance ---
log "Checking buyer balance..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET $API_GATEWAY/api/wallet/balance \
  -H "Authorization: Bearer $BUYER_TOKEN")
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$CODE" -ne 200 ]; then
    echo "ERROR: Failed to check balance. Code: $CODE, Body: $BODY"
    exit 1
fi
echo "$BODY" | jq .

# --- STEP 7: Top Up Buyer Wallet ---
log "Topping up buyer wallet..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $API_GATEWAY/api/wallet/topup \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00}')
CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$CODE" -ne 204 ] && [ "$CODE" -ne 200 ]; then
    echo "ERROR: Top-up failed. Code: $CODE"
    exit 1
fi
success "Top-up request sent."

# Wait a bit for async processing if any (though wallet topup seems sync in handler)
sleep 1

# --- STEP 8: Check Balance After Top-up ---
log "Balance after top-up:"
curl -s -X GET $API_GATEWAY/api/wallet/balance \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq .

# --- STEP 9: Interaction - Post Comment ---
log "Posting comment..."
curl -s -X POST $API_GATEWAY/api/interactions/comments \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"beat_id": "'"$BEAT_ID"'", "text": "Absolute banger!"}' | jq .

# --- STEP 10: Interaction - Rate Beat ---
log "Rating beat (5 stars)..."
curl -s -X POST $API_GATEWAY/api/interactions/ratings \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"beat_id": "'"$BEAT_ID"'", "value": 5}' | jq .

# --- STEP 11: Order - Buy the Beat ---
log "Purchasing the beat..."
BUY_RESP=$(curl -s -X POST $API_GATEWAY/api/orders/buy \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"beat_id": "'"$BEAT_ID"'"}')
echo $BUY_RESP | jq .

# --- STEP 12: Verify Final State ---
log "Verifying final buyer balance (should be 75.00):"
curl -s -X GET $API_GATEWAY/api/wallet/balance \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq .

log "Checking buyer orders:"
curl -s -X GET $API_GATEWAY/api/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq .

success "Full system test completed!"
