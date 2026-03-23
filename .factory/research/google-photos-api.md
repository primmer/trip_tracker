# Google Photos API Research

## CRITICAL: API Restriction (April 2025)
As of April 1, 2025, Google restricted the Library API (`photoslibrary.readonly`).
- It now only allows apps to access media items the APP ITSELF created/uploaded
- For personal use: keep app in "Testing" status in Google Cloud Console
- Testing mode allows up to 100 test users (just need the owner's account)
- Alternative: Google Photos Picker API (requires manual user selection each time)

## OAuth
- Use `google-auth-library` npm package
- Scope: `https://www.googleapis.com/auth/photoslibrary.readonly`
- Must set `access_type: 'offline'` and `prompt: 'consent'` for refresh token
- Store refresh token durably

## Key Endpoints
| Feature | Endpoint | Notes |
|---------|----------|-------|
| Search by date | `POST /v1/mediaItems:search` | `dateFilter.ranges` for date range |
| Get item | `GET /v1/mediaItems/{id}` | Returns `baseUrl`, `filename`, `mediaMetadata` |
| List items | `GET /v1/mediaItems` | Paginated |

## Photo URLs & Resolution
- `baseUrl` is a serving URL, append parameters:
  - `=w256-h256` for thumbnail
  - `=w2048` for large
  - `=d` for original file download (includes EXIF)
- Base URLs expire after 60 minutes -- must refresh or generate on demand

## Geolocation
- Google STRIPS lat/lng from the JSON `mediaMetadata` response for privacy
- Workaround: append `=d` to `baseUrl` to download original, parse EXIF for GPS coordinates
- Need an EXIF parser library (e.g., `exif-reader`, `exifr`)

## Filename Matching with Strava
- `filename` field available in MediaItem response
- No server-side filename filter -- must search by date, then filter client-side
- Pattern: search by activity date range -> iterate results -> match filenames

## CONFIRMED: GPS Stripped from API Downloads
The official Picker API docs for the `=d` parameter explicitly state:
"download the image retaining all the Exif metadata **except the location metadata**"

However, user reports that downloading directly from Google Photos web UI preserves GPS.
This needs empirical testing with the Picker API's `baseUrl=d` to confirm.

## Chosen Approach: Picker + Firebase Storage
1. User opens Google Photos Picker to select trip photos (per-trip, one-time action)
2. App downloads selected photos via `baseUrl=d` (or `=w2048` for display size)
3. Photos are stored permanently in Firebase Storage, metadata in Firestore
4. Attempt EXIF GPS extraction from downloaded bytes
5. Fallback: match photo `createTime` against Strava GPS track for geolocation
6. Strava photos are low quality (~thumbnail) -- avoid as primary image source

## Rate Limits
- 10,000 requests per project per day (can be increased)
- Be mindful of rapid sequential calls
- baseUrl expires after 60 minutes -- download and store immediately during picker session
