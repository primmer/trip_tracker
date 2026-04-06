# Firebase + Vite React Setup Research

## Project Structure

```
trip-tracker/
├── firebase.json          # Root config
├── firestore.rules        # Security rules
├── .firebaserc            # Project aliases
├── package.json           # Frontend deps
├── vite.config.ts
├── dist/                  # Vite build output
├── src/                   # React source
│   └── firebase.ts        # Client-side Firebase init
└── functions/             # Cloud Functions (Backend)
    ├── package.json
    ├── tsconfig.json
    └── src/index.ts        # v2 functions entry
```

## Firebase Hosting Config

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "functions": { "source": "functions", "runtime": "nodejs20" },
  "emulators": {
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true }
  }
}
```

## Cloud Functions v2

- Use `firebase-functions/v2/https` for HTTP functions
- Secrets via Google Cloud Secret Manager: `firebase functions:secrets:set KEY_NAME`
- Access via `process.env.KEY_NAME` after declaring in `secrets` option
- v2 supports better concurrency and regional config

## Firestore Schema (for caching)

- `trips/{tripId}` - trip metadata, hashtag, date range
- `trips/{tripId}/activities/{activityId}` - activity data, streams
- `trips/{tripId}/photos/{photoId}` - photo metadata, location, URLs
- Documents have 1MB limit; use subcollections for large data

## Local Development

- Firebase Emulator Suite for local dev
- Connect Vite dev server to emulators in dev mode
- `firebase emulators:start` runs all emulators

## Packages

- Frontend: `firebase`
- Backend: `firebase-admin`, `firebase-functions`
- Dev: `firebase-tools` (CLI)
