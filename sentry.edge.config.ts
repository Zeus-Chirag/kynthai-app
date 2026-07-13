import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  release: process.env.npm_package_version || '0.0.0',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});
