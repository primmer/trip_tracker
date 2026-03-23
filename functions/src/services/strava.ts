import admin from 'firebase-admin';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const TOKENS_DOC_PATH = 'secrets/strava_tokens';

export async function getStravaTokens(): Promise<StravaTokens | null> {
  const db = admin.firestore();
  try {
    const doc = await db.doc(TOKENS_DOC_PATH).get();
    if (doc.exists) {
      return doc.data() as StravaTokens;
    }
  } catch (error) {
    console.warn('Failed to read Strava tokens from Firestore:', error);
  }

  // Fallback to .env for initialization
  const access_token = process.env.STRAVA_ACCESS_TOKEN; // Optional
  const refresh_token = process.env.STRAVA_REFRESH_TOKEN;
  if (refresh_token) {
    console.log('Using Strava refresh token from environment');
    return {
      access_token: access_token || '',
      refresh_token: refresh_token,
      expires_at: 0, // Force refresh
    };
  }

  return null;
}

export async function saveStravaTokens(tokens: StravaTokens): Promise<void> {
  const db = admin.firestore();
  try {
    await db.doc(TOKENS_DOC_PATH).set(tokens);
  } catch (error) {
    console.warn('Failed to save Strava tokens to Firestore:', error);
  }
}

export async function refreshStravaTokenIfNeeded(): Promise<string> {
  const tokens = await getStravaTokens();
  if (!tokens) {
    throw new Error('Strava tokens not found in Firestore. Run setup script.');
  }

  const now = Math.floor(Date.now() / 1000);
  // Refresh if expiring in less than 5 minutes
  if (tokens.expires_at > now + 300) {
    return tokens.access_token;
  }

  console.log('Refreshing Strava access token...');

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set in environment.');
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Strava token: ${response.status} ${errorBody}`);
  }

  const newTokens = await response.json();
  const updatedTokens: StravaTokens = {
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    expires_at: newTokens.expires_at,
  };

  await saveStravaTokens(updatedTokens);
  return updatedTokens.access_token;
}
