# Architecture

Architectural decisions, patterns, and conventions.

**What belongs here:** Tech stack decisions, data flow patterns, component structure, naming conventions.

---

## Tech Stack
- **Frontend**: Vite + React + TypeScript (SPA)
- **Backend**: Firebase Cloud Functions v2 (TypeScript)
- **Database**: Cloud Firestore (real hosted instance, no emulator)
- **Storage**: Firebase Storage (for photos)
- **Maps**: Google Maps JavaScript API via `@vis.gl/react-google-maps`
- **Testing**: Vitest + React Testing Library

## Project Structure
```
trip-tracker/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route-level page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client code (Firestore, Maps)
│   ├── utils/              # Pure utility functions
│   ├── types/              # TypeScript type definitions
│   └── firebase.ts         # Firebase client initialization
├── functions/              # Cloud Functions backend
│   └── src/                # Functions source (TypeScript)
├── dist/                   # Vite build output
└── firebase.json           # Firebase config
```

## Data Flow
1. **Strava Sync**: Cloud Function -> Strava API -> Firestore (activities, trips)
2. **Photo Attachment**: Picker API -> Download -> Firebase Storage + Firestore metadata
3. **Frontend Display**: Firestore reads -> React state -> Map/Gallery rendering
4. **Geolocation**: Photo timestamp -> match against Strava GPS stream -> lat/lng

## Firestore Schema
- `trips/{tripId}` - hashtag, name, dateRange, activityIds
- `activities/{activityId}` - Strava activity metadata (no large stream arrays)
- `activities/{activityId}/streams/data` - `latlng_json`, `altitude_json`, `time_json`, `distance_json` (JSON strings)
- `trips/{tripId}/photos/{photoId}` - storagePath, filename, createdAt, lat, lng, downloadUrl, width, height

## Key Patterns
- All Strava/Google API calls go through Cloud Functions (secrets stay server-side)
- Frontend reads directly from Firestore (no auth required for reads)
- Photos are stored permanently in Firebase Storage; never rely on Google Photos baseUrl
- Use VITE_ prefix for client-safe env vars only
