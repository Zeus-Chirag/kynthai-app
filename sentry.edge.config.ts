import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Match sentry.server.config.ts: stay a no-op when no DSN is configured,
// otherwise init would warn/throw on every edge invocation.
Sentry.init({
  dsn: sentryDsn,
  environment: process.env.NODE_ENV || 'production',
  release: process.env.npm_package_version || '0.0.0',
  enabled: !!sentryDsn && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});