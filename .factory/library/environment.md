# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## GCP Project
- Project ID: `primco-trip-tracker`
- Firebase + Firestore + Storage hosted here

## Required Environment Variables
- `STRAVA_CLIENT_ID` - Strava OAuth app client ID
- `STRAVA_CLIENT_SECRET` - Strava OAuth app client secret
- `STRAVA_REFRESH_TOKEN` - Long-lived Strava refresh token
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REFRESH_TOKEN` - Google OAuth refresh token
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps JS API key (client-safe, VITE_ prefix)
- `VITE_FIREBASE_CONFIG` - Firebase web app config (client-safe)

## Google APIs to Enable
1. Maps JavaScript API
2. Geocoding API
3. Places API (New)
4. Photos Picker API
5. Cloud Firestore API
6. Firebase Storage

## Strava API
- Rate limits: 100 requests/15min, 1000/day
- Access tokens expire in 6 hours; use refresh token
- Need `activity:read_all` scope for private descriptions (hashtags)

## Google Photos Picker API
- Library API scopes (photoslibrary.readonly) are DEAD as of March 31, 2025
- Use Picker API with scope `photospicker.mediaitems.readonly`
- baseUrl expires in 60 minutes -- download immediately
- GPS coordinates are stripped from API downloads (=d parameter)
- Must derive location from Strava GPS track timestamp matching
