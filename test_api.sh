#!/bin/bash

# A script to test the core functionality of the Beat Marketplace API.
# It uses curl to send requests and jq to parse JSON from responses.

# Make sure to install jq: sudo apt-get install jq or sudo yum install jq or brew install jq

set -e
set -x

echo "--- Waiting for services to start up... ---"
sleep 10

# --- Configuration ---
API_GATEWAY="http://localhost:8000"
UNIQUE_ID=$(date +%s)
USERNAME="testuser_$UNIQUE_ID"
EMAIL="testuser_$UNIQUE_ID@example.com"
PHONE="1234567890"
PASSWORD="Password123!"
BEAT_TITLE="My Dope Beat"
BEAT_PRICE="19.99"
BEAT_TAGS='"hip-hop", "trap", "808"'

# --- Step 1: Sign up a new user ---
echo "--- Signing up new user: $USERNAME ---"
# This hits the auth-service via the Nginx gateway
SIGNUP_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "'"$USERNAME"'", "email": "'"$EMAIL"'", "phone": "'"$PHONE"'", "password": "'"$PASSWORD"'", "role": "user"}' \
  $API_GATEWAY/api/auth/register)

echo "SIGNUP RESPONSE: $SIGNUP_RESPONSE"
# The auth service returns the user ID and a token directly on signup
USER_ID=$(echo $SIGNUP_RESPONSE | jq -r '.userId')
TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')

if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
    echo "ERROR: User signup failed or did not return a userId."
    exit 1
fi
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "ERROR: User signup failed or did not return a token."
    exit 1
fi
echo "User created with ID: $USER_ID"
echo "Received token successfully."
echo ""

# --- Step 2: Log in (optional, as signup already provides a token) ---
echo "--- Logging in as $EMAIL to get a new token ---"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$EMAIL"'", "password": "'"$PASSWORD"'"}' \
  $API_GATEWAY/api/auth/login)

echo "LOGIN RESPONSE: $LOGIN_RESPONSE"
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "ERROR: Login failed or did not return a token."
    exit 1
fi
echo "Logged in successfully. New token received."
echo ""


# --- Step 3: Create a new beat ---
echo "--- Creating a new beat: '$BEAT_TITLE' ---"
# This hits the beat-service, which will be validated by the gateway using the token
CREATE_BEAT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "title": "'"$BEAT_TITLE"'",
        "price": '$BEAT_PRICE',
        "tags": ['"$BEAT_TAGS"'],
        "audioUrl": "/dummy/audio.mp3",
        "imageUrl": "/dummy/image.jpg"
      }' \
  $API_GATEWAY/api/beats)

echo "CREATE BEAT RESPONSE: $CREATE_BEAT_RESPONSE"
BEAT_ID=$(echo $CREATE_BEAT_RESPONSE | jq -r '.id')
if [ -z "$BEAT_ID" ] || [ "$BEAT_ID" == "null" ]; then
    echo "ERROR: Beat creation failed or did not return an ID."
    echo "Maybe there is an error with the user service, which the beat service calls."
    exit 1
fi
echo "Beat created with ID: $BEAT_ID"
echo ""


# --- Step 4: Post a comment on the new beat ---
echo "--- Posting a comment on beat ID: $BEAT_ID ---"
# This hits the interaction-service
COMMENT_TEXT="This beat is fire! 🔥"
POST_COMMENT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"beat_id": "'"$BEAT_ID"'", "text": "'"$COMMENT_TEXT"'"}' \
  $API_GATEWAY/api/interactions/comments)

echo "POST COMMENT RESPONSE: $POST_COMMENT_RESPONSE"
COMMENT_ID=$(echo $POST_COMMENT_RESPONSE | jq -r '.id')
if [ -z "$COMMENT_ID" ] || [ "$COMMENT_ID" == "null" ]; then
    echo "ERROR: Commenting failed or did not return an ID."
    exit 1
fi
echo "Comment posted with ID: $COMMENT_ID"
echo ""

echo "--- ✅ All tests passed successfully! ---"
