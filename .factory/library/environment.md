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

## Version Control

This project uses **Jujutsu (jj)**, NOT git. All commit operations must use `jj describe`/`jj new`.
