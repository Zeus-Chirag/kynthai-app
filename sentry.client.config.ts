import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!sentryDsn && process.env.NODE_ENV === 'production') {
  console.warn('Sentry DSN is not configured. Error reporting is disabled.');
}

Sentry.init({
  dsn: sentryDsn,
  environment: process.env.NODE_ENV || 'production',
  release: process.env.npm_package_version || '0.0.0',
  enabled: !!sentryDsn && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
});
