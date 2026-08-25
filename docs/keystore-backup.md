# Kynthai — Keystore & Secrets Backup

## ⚠️ CRITICAL: Losing the keystore blocks ALL future Play Store updates.

## Keystore Details

| Field | Value |
|-------|-------|
| File | `kynthai-release.keystore` |
| Location | `/Users/c.k/kynthai-touch/android/app/kynthai-release.keystore` |
| Backup | `/Users/c.k/Desktop/kynthai-release-backup.keystore` |
| Alias | `kynthai` |
| Store password | `Kynthai2026!` |
| Key password | `Kynthai2026!` |
| Algorithm | RSA 2048-bit |
| Valid until | January 2054 |
| Owner | CN=Kynthai Health Technologies, L=Harrisonville, ST=Missouri, C=US |

## Backup Locations (Store ALL of these)

1. **Desktop backup** — `/Users/c.k/Desktop/kynthai-release-backup.keystore` ✅
2. **Google Drive** — Upload to a secure folder
3. **USB drive** — Copy to a physical USB drive stored offline
4. **Password manager** — Store the keystore file + passwords in 1Password/Bitwarden

## key.properties

```
storePassword=Kynthai2026!
keyPassword=Kynthai2026!
keyAlias=kynthai
storeFile=kynthai-release.keystore
```

## Secrets to Back Up

| Secret | Where to Store |
|--------|---------------|
| Keystore file + passwords | Password manager + USB |
| Supabase service role key | Password manager |
| Stripe secret key | Password manager |
| VAPID private key | Password manager |
| SendGrid API key | Password manager |
| Sentry auth token | Password manager |
| GitHub PAT | Password manager |
| Vercel token | Password manager |
| OpenRouter API key | Password manager |
| NVIDIA API key | Password manager |

## What Happens If You Lose the Keystore

- You CANNOT update the app on Google Play
- You must create a NEW app listing with a different package name
- All existing users lose access to updates
- All reviews and ratings are lost

**Back up the keystore NOW. Do not wait.**
