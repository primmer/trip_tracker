import * as functions from 'firebase-functions/v2';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { router } from './router.js';

// Use default export for admin to avoid initialization issues in some environments
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(router);

export const api = functions.https.onRequest({ cors: true }, app);
