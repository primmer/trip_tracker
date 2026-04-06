import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DSN,
});

export { Sentry };
