import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as http from 'http';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('FIREBASE_PROJECT_ID is not set in .env');
    process.exit(1);
}
if (!admin.apps.length) {
    admin.initializeApp({
        projectId,
    });
}
const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;
async function setupGoogle() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
        process.exit(1);
    }
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    console.log('\n=== Google OAuth Setup ===\n');
    console.log('Make sure http://localhost:3000/callback is added as an authorized redirect URI');
    console.log('in your Google Cloud Console OAuth credentials.\n');
    console.log('Open this URL in your browser to authorize:\n');
    console.log(authUrl.toString());
    console.log('\nWaiting for callback...\n');
    const server = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
        if (reqUrl.pathname !== '/callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');
        if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
            console.error(`Authorization failed: ${error}`);
            server.close();
            process.exit(1);
        }
        if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Missing authorization code</h1>');
            console.error('No authorization code received in callback.');
            server.close();
            process.exit(1);
        }
        try {
            console.log('Received authorization code, exchanging for tokens...');
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                }),
            });
            if (!tokenResponse.ok) {
                const errorBody = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
            }
            const data = await tokenResponse.json();
            if (!data.refresh_token) {
                throw new Error('No refresh_token returned. Make sure prompt=consent is set and the app has not already been authorized. ' +
                    'Revoke access at https://myaccount.google.com/permissions and try again.');
            }
            const tokens = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
            };
            const db = admin.firestore();
            await db.doc('secrets/google_tokens').set(tokens);
            console.log('Successfully saved Google tokens to Firestore.');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Success!</h1><p>Google tokens saved to Firestore. Setup complete!</p>');
            server.close();
            process.exit(0);
        }
        catch (err) {
            console.error('Error during token exchange:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>${err instanceof Error ? err.message : String(err)}</p>`);
            server.close();
            process.exit(1);
        }
    });
    server.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}/callback for OAuth callback...`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Stop the other process and try again.`);
        }
        else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });
}
setupGoogle();
//# sourceMappingURL=setup-google.js.map