import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
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
async function setupStrava() {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        console.error('Missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, or STRAVA_REFRESH_TOKEN in .env');
        process.exit(1);
    }
    console.log('Initializing Strava tokens in Firestore...');
    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to initialize Strava token: ${response.status} ${errorBody}`);
        }
        const data = await response.json();
        const tokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
        };
        const db = admin.firestore();
        await db.doc('secrets/strava_tokens').set(tokens);
        console.log('Successfully initialized Strava tokens in Firestore.');
    }
    catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}
setupStrava();
//# sourceMappingURL=setup-strava.js.map