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

## Author

David Primmer
