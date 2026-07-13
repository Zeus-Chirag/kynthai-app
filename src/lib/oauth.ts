/**
 * OAuth Configuration
 * Supports Google and Apple Sign-In for healthcare app
 */

export const OAUTH_PROVIDERS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    enabled: !!process.env.GOOGLE_CLIENT_ID,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    enabled: !!process.env.APPLE_CLIENT_ID,
  },
} as const

export function isOAuthEnabled(): boolean {
  return OAUTH_PROVIDERS.google.enabled || OAUTH_PROVIDERS.apple.enabled
}

export function getEnabledProviders(): string[] {
  const providers: string[] = []
  if (OAUTH_PROVIDERS.google.enabled) providers.push('google')
  if (OAUTH_PROVIDERS.apple.enabled) providers.push('apple')
  return providers
}
