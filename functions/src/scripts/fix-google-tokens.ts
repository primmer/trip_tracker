import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'primco-trip-tracker',
  });
}

async function fixGoogleTokens() {
  const db = admin.firestore();

  const refreshTokenFromEnv = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshTokenFromEnv) {
    console.error('No GOOGLE_REFRESH_TOKEN found in .env file');
    process.exit(1);
  }

  console.log('Current token from .env:', refreshTokenFromEnv.substring(0, 30) + '...');

  // Get current tokens from Firestore
  const doc = await db.doc('secrets/google_tokens').get();
  if (doc.exists) {
    const data = doc.data();
    console.log('Current Firestore refresh_token:', data?.refresh_token?.substring(0, 30) + '...');
    console.log('Tokens are the same:', data?.refresh_token === refreshTokenFromEnv);
  }

  // Reset the token in Firestore to force a refresh
  const tokens = {
    access_token: '',
    refresh_token: refreshTokenFromEnv,
    expires_at: 0, // Force refresh
  };

  await db.doc('secrets/google_tokens').set(tokens);
  console.log('\n✓ Reset Google tokens in Firestore');
  console.log('The next picker session request will attempt to refresh the access token.');
  console.log('\nIf this still fails, your .env refresh_token may also be invalid.');
  console.log('In that case, run: npm run setup:google');

  process.exit(0);
}

fixGoogleTokens().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
