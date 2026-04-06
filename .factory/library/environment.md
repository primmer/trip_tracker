# Environment

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables

- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps JavaScript API key (also covers Map Tiles API for 3D)
- `VITE_GOOGLE_MAPS_ID` — Google Maps map ID (may not be needed for Map3D, which doesn't use mapId)
- `VITE_ADMIN_KEY` — Admin mode session key (append `?admin=<key>` to URL)
- `VITE_SENTRY_DSN` — Sentry error tracking DSN

## Google Cloud APIs Required

- **Maps JavaScript API** — Core map rendering
- **Map Tiles API** — Photorealistic 3D Tiles for Map3D (already enabled on `primco-trip-tracker`)
- **Geometry library** — Loaded client-side via APIProvider `libraries={['geometry', 'maps3d']}`

## Firebase Storage CORS

Firebase Storage bucket `gs://primco-trip-tracker.firebasestorage.app` has CORS configured to allow GET from any origin:
```json
[{"maxAgeSeconds": 3600, "method": ["GET", "HEAD"], "origin": ["*"], "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]}]
```
This was set with: `gsutil cors set cors.json gs://primco-trip-tracker.firebasestorage.app`

**IMPORTANT**: When loading Firebase Storage images inside `gmp-marker-3d-interactive` shadow DOM:
- The web component forces `crossorigin="anonymous"` on `<img>` elements
- Chrome sends cookies by default for `googleapis.com` requests (makes them credentialed)
- Credentialed CORS requests fail with `Access-Control-Allow-Origin: *` (needs specific origin)
- **Fix**: Pre-fetch images with `fetch(url, { credentials: 'omit', cache: 'reload' })`, then use `URL.createObjectURL(blob)` as the `<img>` src. Blob URLs are same-origin, bypassing CORS.
- See `PhotoMarkers.tsx` for the implementation pattern.

## Version Control

This project uses **Jujutsu (jj)**, NOT git. All commit operations must use `jj describe`/`jj new`.
