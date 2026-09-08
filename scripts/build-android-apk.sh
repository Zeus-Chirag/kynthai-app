#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-debug}"

if command -v npx >/dev/null 2>&1; then
  npx cap sync android 2>/dev/null || true
fi

cd android
chmod +x gradlew

if [ "$MODE" = "release" ]; then
  # Validate signing configuration
  # The app uses key.properties for release signing (loaded by android/app/build.gradle)
  KEY_PROPS="android/key.properties"
  KEY_PROJECT="android/key.properties"

  if [ ! -f "$KEY_PROPS" ]; then
    echo "ERROR: Release signing key not found."
    echo "  Expected: $KEY_PROPS"
    echo ""
    echo "  To sign a release build, create android/key.properties with:"
    echo "    storeFile=<path-to-keystore>"
    echo "    storePassword=<password>"
    echo "    keyAlias=<alias-name>"
    echo "    keyPassword=<password>"
    echo ""
    echo "  Or set the equivalent environment variables ANDROID_KEYSTORE_PATH,"
    echo "  ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD"
    echo "  AND ensure android/key.properties exists."
    exit 1
  fi

  # Validate that key.properties has all required fields
  STORE_FILE=$(grep -o 'storeFile=[^ ]*' "$KEY_PROPS" | cut -d= -f2 | tr -d "'")
  STORE_PASSWORD=$(grep -o 'storePassword=[^ ]*' "$KEY_PROPS" | cut -d= -f2 | tr -d "'')
  KEY_ALIAS=$(grep -o 'keyAlias=[^ ]*' "$KEY_PROPS" | cut -d= -f2 | tr -d "'')
  KEY_PASSWORD=$(grep -o 'keyPassword=[^ ]*' "$KEY_PROPS" | cut -d= -f2 | tr -d "'')

  if [ -z "$STORE_FILE" ] || [ -z "$STORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
    echo "ERROR: android/key.properties is missing required fields."
    echo "  Required: storeFile, storePassword, keyAlias, keyPassword"
    echo "  Found storeFile='$STORE_FILE', storePassword='$STORE_PASSWORD',"
    echo "  keyAlias='$KEY_ALIAS', keyPassword='$KEY_PASSWORD'"
    exit 1
  fi

  echo "Validating keystore..."
  ./gradlew assembleRelease --no-daemon
  OUT="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug --no-daemon
  OUT="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
fi

echo "Build complete: $OUT"
