#!/bin/bash
# Kynthai API Test Helper
# Usage: ./test-api.sh <email> <password> <endpoint> [method] [data]

BASE="http://localhost:3000"
COOKIE_JAR="/tmp/kynthai-test-$$.txt"
trap "rm -f $COOKIE_JAR" EXIT

EMAIL=$1
PASSWORD=$2
ENDPOINT=$3
METHOD=${4:-GET}
DATA=$5

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ] || [ -z "$ENDPOINT" ]; then
  echo "Usage: $0 <email> <password> <endpoint> [method] [data]"
  echo "Example: $0 demo@kynthai.app Demo1234! /api/medications"
  exit 1
fi

# Step 1: Get CSRF token (saves cookie to jar)
curl -s -c "$COOKIE_JAR" "$BASE/api/auth/csrf" > /dev/null
CSRF=$(grep kynthai-csrf "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')

if [ -z "$CSRF" ]; then
  echo "ERROR: Failed to get CSRF token"
  exit 1
fi

# Step 2: Login (saves all cookies including Supabase)
LOGIN_RESP=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check login success
LOGIN_NAME=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','FAIL'))" 2>/dev/null)
if [ "$LOGIN_NAME" = "FAIL" ]; then
  echo "ERROR: Login failed"
  echo "$LOGIN_RESP" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESP"
  exit 1
fi

# Step 3: Get fresh CSRF for API call
curl -s -c "$COOKIE_JAR" "$BASE/api/auth/csrf" -b "$COOKIE_JAR" > /dev/null
CSRF2=$(grep kynthai-csrf "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
[ -z "$CSRF2" ] && CSRF2=$CSRF

# Step 4: Make the API call with ALL cookies from the jar
if [ "$METHOD" = "GET" ]; then
  RESULT=$(curl -s "$BASE$ENDPOINT" \
    -b "$COOKIE_JAR" \
    -H "x-csrf-token: $CSRF2")
elif [ "$METHOD" = "POST" ]; then
  RESULT=$(curl -s -X POST "$BASE$ENDPOINT" \
    -H 'Content-Type: application/json' \
    -H "x-csrf-token: $CSRF2" \
    -b "$COOKIE_JAR" \
    -d "$DATA")
elif [ "$METHOD" = "PATCH" ]; then
  RESULT=$(curl -s -X PATCH "$BASE$ENDPOINT" \
    -H 'Content-Type: application/json' \
    -H "x-csrf-token: $CSRF2" \
    -b "$COOKIE_JAR" \
    -d "$DATA")
elif [ "$METHOD" = "DELETE" ]; then
  RESULT=$(curl -s -X DELETE "$BASE$ENDPOINT" \
    -H 'Content-Type: application/json' \
    -H "x-csrf-token: $CSRF2" \
    -b "$COOKIE_JAR" \
    -d "$DATA")
fi

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
