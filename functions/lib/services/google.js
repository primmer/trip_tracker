import admin from 'firebase-admin';
const TOKENS_DOC_PATH = 'secrets/google_tokens';
export async function getGoogleTokens() {
    const db = admin.firestore();
    try {
        const doc = await db.doc(TOKENS_DOC_PATH).get();
        if (doc.exists) {
            return doc.data();
        }
    }
    catch (error) {
        console.warn('Failed to read Google tokens from Firestore:', error);
    }
    return null;
}
export async function saveGoogleTokens(tokens) {
    const db = admin.firestore();
    try {
        await db.doc(TOKENS_DOC_PATH).set(tokens);
    }
    catch (error) {
        console.warn('Failed to save Google tokens to Firestore:', error);
    }
}
export async function refreshGoogleTokenIfNeeded() {
    const tokens = await getGoogleTokens();
    if (!tokens) {
        throw new Error('Google tokens not found in Firestore. Run setup script.');
    }
    if (!tokens.refresh_token) {
        throw new Error('Google refresh token is missing. ' +
            'Run "npm run setup:google" in the functions directory to re-authorize.');
    }
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expires_at > now + 300 && tokens.access_token) {
        return tokens.access_token;
    }
    console.log('Refreshing Google access token...');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in environment.');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
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
        // Check for specific OAuth errors
        if (errorBody.includes('invalid_grant')) {
            throw new Error('Google refresh token has been invalidated. This can happen if:\n' +
                '1. You revoked app access at https://myaccount.google.com/permissions\n' +
                '2. The token expired due to inactivity\n' +
                '3. The token was used too many times\n\n' +
                'To fix: Run "npm run setup:google" in the functions directory to re-authorize.');
        }
        throw new Error(`Failed to refresh Google token: ${response.status} ${errorBody}`);
    }
    const data = await response.json();
    const updatedTokens = {
        access_token: data.access_token,
        refresh_token: tokens.refresh_token, // Refresh token might not be returned
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    };
    await saveGoogleTokens(updatedTokens);
    return updatedTokens.access_token;
}
export async function createPickerSession(maxItemCount = 50) {
    const accessToken = await refreshGoogleTokenIfNeeded();
    const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pickingConfig: {
                maxItemCount: maxItemCount.toString(),
            },
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create Picker session: ${response.status} ${errorBody}`);
    }
    return await response.json();
}
export async function getPickerSession(sessionId) {
    const accessToken = await refreshGoogleTokenIfNeeded();
    const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to get Picker session: ${response.status} ${errorBody}`);
    }
    return await response.json();
}
export async function listPickedMediaItems(sessionId) {
    const accessToken = await refreshGoogleTokenIfNeeded();
    let mediaItems = [];
    let pageToken;
    do {
        const url = new URL('https://photospicker.googleapis.com/v1/mediaItems');
        url.searchParams.append('sessionId', sessionId);
        if (pageToken) {
            url.searchParams.append('pageToken', pageToken);
        }
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to list picked media items: ${response.status} ${errorBody}`);
        }
        const data = await response.json();
        if (data.mediaItems) {
            mediaItems = mediaItems.concat(data.mediaItems);
        }
        pageToken = data.nextPageToken;
    } while (pageToken);
    return mediaItems;
}
//# sourceMappingURL=google.js.map