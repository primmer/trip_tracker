import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const api = functions.https.onRequest({ cors: true }, (req, res) => {
  if (req.path === '/health' || req.path === '/api/health') {
    res.status(200).json({ status: 'ok' });
    return;
  }
  res.status(404).json({ error: 'Not Found' });
});
