import admin from 'firebase-admin';
const TOKENS_DOC_PATH = 'secrets/strava_tokens';
export async function getStravaTokens() {
    const db = admin.firestore();
    const doc = await db.doc(TOKENS_DOC_PATH).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
}
export async function saveStravaTokens(tokens) {
    const db = admin.firestore();
    await db.doc(TOKENS_DOC_PATH).set(tokens);
}
export async function refreshStravaTokenIfNeeded() {
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
    const updatedTokens = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newTokens.expires_at,
    };
    await saveStravaTokens(updatedTokens);
    return updatedTokens.access_token;
}
//# sourceMappingURL=strava.js.map