import express from 'express';
import cors from 'cors';
import { router } from './router.js';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'primco-trip-tracker',
  });
}

const app = express();
const port = 5001;

// Proper CORS for local frontend
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));

// For compatibility with /api prefix often used in frontends
app.use('/api', router);

// The router handles both /health and /api/health
app.use(router);

app.listen(port, () => {
  console.log(`Standalone Functions Dev Server listening at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
