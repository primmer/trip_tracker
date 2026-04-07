# Bike Trip Tracker

A web app for tracking bike trips and bikepacking adventures. Integrates Strava for routes and activities, Google Photos for geotagged imagery, and Google Maps for interactive satellite and 3D map display. The emphasis is on visual storytelling and photo presentation, not data logging.

## Features

- **Trip grouping** -- Strava activities are grouped into multi-day trips via hashtags in the activity description (e.g. `#hmb_jul4`). Individual rides can also be explored standalone.
- **Photo mapping** -- Photos added per-trip via Google Photos picker. Geolocation is derived by matching photo timestamps against GPS streams. Photos taken during a ride appear as markers on the map.
- **Interactive maps** -- Full-bleed satellite/hybrid map with 3D tilt and rotation. Scrubbable elevation chart with live map marker. Route animation with play/pause and speed controls.
- **Auto-enhanced descriptions** -- Generic Strava titles are replaced with geographic points of interest (mountains, ridges, parks) identified along the route.
- **Photo gallery** -- Grid of thumbnails grouped by date with a lightbox supporting keyboard nav and swipe gestures.

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- API keys/tokens for Strava, Google Photos, and Google Maps

## Setup

```sh
cp .env.example .env
# Fill in your API keys and tokens in .env
npm install
cd functions && npm install && cd ..
```

## Development

```sh
./dev.sh
```

This starts both the Vite frontend (`:5173`) and the Cloud Functions dev server (`:5001`), checks if each is already running, and prints health status.

### Mobile Testing with Tailscale

Test on your phone without deploying by exposing the dev server via Tailscale:

```sh
# Terminal 1: Start dev server (already running)
./dev.sh

# Terminal 2: Expose to your Tailscale network
tailscale serve --http 5173 localhost:5173
```

Then on your phone, open: `http://<your-mac-hostname>.<tailnet>.ts.net:5173`

The `vite.config.ts` already has `allowedHosts: true` configured to allow Tailscale hostnames.

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start Vite dev server             |
| `npm run build`     | TypeScript check + Vite build     |
| `npm run typecheck` | Run TypeScript compiler (no emit) |
| `npm run lint`      | Run ESLint                        |
| `npm test`          | Run Vitest                        |

## Deployment

Hosted on Firebase. Project ID: `primco-trip-tracker`.

```sh
# Full deploy (frontend + functions + rules)
npx vite build && firebase deploy

# Frontend only
npx vite build && firebase deploy --only hosting

# Functions only
firebase deploy --only functions
```

## Admin Mode

Append `?admin=<key>` to any URL to enable admin features (photo picker, sync controls). Use `?admin=off` to clear.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Firebase Cloud Functions (Express), Firestore, Firebase Storage
- **APIs**: Strava, Google Photos Picker, Google Maps JavaScript API

## Code Quality

- **Linting**: ESLint with TypeScript strict mode, naming conventions, and import rules
- **Formatting**: Prettier, enforced via pre-commit hook (Husky + lint-staged)
- **Testing**: Vitest with coverage thresholds (30% minimum), React Testing Library
- **Dependency hygiene**: knip for unused dependency detection (`npm run knip`)
- **Error tracking**: Sentry on both frontend and backend (production only)

# Design Decisions

### Homepage

- Full-bleed hero photo that randomly rotates among trips with photos. Route polyline and elevation profile line overlay the hero, with a dark top gradient for nav/elevation contrast.
- Trip grid shows only trips with photos. Each tile has a photo background, route polyline, and elevation line at the bottom.
- Nav shows only "Trips" (plus "Admin" when in admin mode).

### Trips Page

- All trips listed grouped by month, regardless of photos. Same tile design as homepage.

### Trip Detail Map

- Full-bleed satellite/hybrid map using Google Maps vector rendering with 3D tilt and heading controls enabled. Users can tilt into 3D and rotate the map freely.
- Bottom overlay contains a scrubbable elevation chart, ride stats (distance, elevation, duration), and route animation controls. The overlay uses a gradient background and is positioned to avoid conflicting with Google Maps' own zoom/tilt controls on the right side.
- For multi-day trips, pill-style ride selector buttons ("All", "Ride 1", "Ride 2", etc.) filter which activity is shown. Selecting a ride re-fits the map bounds to that activity.
- Scrubbing the elevation chart places a marker dot on the map at the corresponding GPS position, with a tooltip showing distance, elevation, and grade.
- Route animation plays a dot along the route path with play/pause and 1x/2x speed controls.

### Trip Detail Photos

- Map photo markers are circular thumbnails. Clicking one opens a dimmed full-viewport preview that covers all UI (rendered outside the Maps component). Clicking the preview photo goes to the gallery lightbox; clicking off dismisses.
- Gallery is a clean grid of square thumbnails grouped by date. No hover overlays or filename display.
- Lightbox supports prev/next arrows, keyboard navigation, and swipe gestures. Shows date/time and position counter only.

### Route & Elevation Overlays

- Route polylines are sized to ~70% of their container. Hero polyline is more prominent than tile polylines.
- Elevation data is fetched from Firestore activity streams and rendered as a thin SVG line -- at the top of the hero, at the bottom of trip tiles.

## Author

David Primmer
