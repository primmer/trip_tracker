import * as functions from 'firebase-functions/v2';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { Sentry } from './sentry.js';
import { router } from './router.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(router);
Sentry.setupExpressErrorHandler(app);

export const api = functions.https.onRequest(
  { cors: true, timeoutSeconds: 300, memory: '512MiB' },
  app,
);
