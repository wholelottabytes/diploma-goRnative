#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="Password123!"

echo "--- 1. Testing Registration ---"
REGISTER_RES=$(curl -s -X POST "${API_URL}/users/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"phone\": \"+1234567890\",
    \"role\": \"seller\"
  }")

echo "Response: ${REGISTER_RES}"

if [[ $REGISTER_RES == *"error"* ]]; then
    echo "Registration failed!"
    exit 1
fi

echo -e "\n--- 2. Testing Login ---"
LOGIN_RES=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

TOKEN=$(echo $LOGIN_RES | grep -oP '"token":"\K[^"]+')

if [ -z "$TOKEN" ]; then
    echo "Login failed! No token received."
    echo "Response: ${LOGIN_RES}"
    exit 1
fi

echo "Login Success! Token obtained."

echo -e "\n--- 3. Testing Profile Access ---"
PROFILE_RES=$(curl -s -X GET "${API_URL}/users/profile" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Profile Response: ${PROFILE_RES}"
