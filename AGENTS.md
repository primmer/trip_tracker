# AGENTS.md

## Project

Bike Trip Tracker -- a web app for tracking bike trips and bikepacking adventures. Integrates Strava (routes/activities), Google Photos (geotagged imagery), and Google Maps (interactive satellite/3D map display). The emphasis is on visual storytelling and photo presentation, not data logging.

## Requirements Source

All product requirements live in `spec.md` at the repo root. Read it before making feature decisions.

## Key Concepts

- **Trip grouping**: Strava activities are grouped into multi-day trips via hashtags in the private activity description (e.g. `#hmb_jul4`). Individual rides can also be explored standalone.
- **Photo filtering**: Photos displayed on the map are filtered by matching Strava activity media attachments against Google Photos (by filename similarity). Strava media are low-res references; full-res images come from Google Photos.
- **Auth model**: No user login. The app connects to one personal Strava/Google account with durable API tokens. Secrets are needed for Strava API, Google Photos API, and Google Maps API.
- **Route data**: Parsed from GPX or similar format from Strava activities; stored for map visualization.
- **Activity descriptions**: Auto-enhanced by scanning the route for geographic points of interest (mountains, ridges, notable areas) to replace Strava's generic titles.

## External APIs

| Service | Purpose |
|---------|---------|
| Strava API | Activity data, routes, media references, activity descriptions |
| Google Photos API | Full-resolution geotagged photos |
| Google Maps JavaScript API | Satellite map display, 3D flyover, geometry library |

## Stream Storage Format

GPS streams (latlng, altitude, time, distance) MUST be stored as JSON string fields in Firestore (`latlng_json`, `altitude_json`, `time_json`, `distance_json`). Never store as native Firestore arrays -- Firestore prohibits nested arrays (latlng is `[[lat,lng],...]`) and large arrays exceed the 40K index entry limit. The frontend parses JSON strings on read. Legacy array fields (`latlng`, `altitude`, etc.) may exist in old documents -- always check for `_json` fields first.

## Visual Design

Dark theme only (no light mode toggle). Use dark gray backgrounds (not pure black) -- e.g., gray-900/gray-800 for surfaces, gray-700 for borders. Dark backgrounds make satellite imagery and photos visually prominent. All text must be legible on dark backgrounds. The overall aesthetic prioritizes visual storytelling over data display.

## Google Maps API Cost Rules

Pay-as-you-go billing. Stay under free tier caps:
- NEVER use the Elevation API (use Strava altitude streams instead)
- Cache ALL Google API results in Firestore -- never re-fetch
- Max 2-3 sample points per route for Geocoding/Places calls
- Places Nearby Search Pro: $32/1000 after 5K free requests
- Geocoding: $5/1000 after 10K free requests

## Version Control

Using local Jujutsu (jj) repository; will eventually move to a private GitHub repo.
