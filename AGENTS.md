# AGENTS.md — Trip Tracker

## Critical Rules

- **Version Control: Use `jj`, NEVER `git`**. This repo is jj-colocated. Use `jj describe -m "..."`, `jj new`, `jj log`, `jj diff`, `jj status`. Commit incrementally—don't let a session pass without checkpoints.
- **Always use `./dev.sh`** to start development (starts Vite on :5173 + Functions on :5001). Never start servers individually.
- **Visual verification required**: Use Chrome DevTools MCP to take snapshots/screenshots after every UI change. Do not rely on code review alone.

## Quick Reference

| Task | Command |
|------|---------|
| Start dev | `./dev.sh` |
| Build | `npx vite build` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Format | `npm run format` |
| Unused deps | `npm run knip` |
| Full deploy | `npx vite build && firebase deploy` |
| Hosting only | `npx vite build && firebase deploy --only hosting` |
| Functions only | `firebase deploy --only functions` |

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite (:5173)
- **Backend**: Firebase Cloud Functions (Express) (:5001)
- **Data**: Firestore (trips, activities, photos as subcollections), Firebase Storage
- **APIs**: Strava (activities/routes), Google Photos (geotagged images), Google Maps JavaScript API (3D satellite)
- **Host**: Firebase Hosting at https://primco-trip-tracker.web.app
- **Project ID**: `primco-trip-tracker`

## Key Concepts

- **Trip grouping**: Multi-day trips group Strava activities via hashtags in activity descriptions (e.g., `#hmb_jul4`).
- **Photo geolocation**: Photos matched to GPS stream by timestamp; on-ride photos get map markers, off-ride photos (camp, etc.) appear in gallery only.
- **Auth**: No user login. Single personal Strava/Google account with durable API tokens. Secrets in `.env` (copy from `.env.example`).
- **Admin mode**: Append `?admin=<VITE_ADMIN_KEY>` to enable admin features (photo picker, /admin page). `?admin=off` to clear.

## Code Quality

- **ESLint**: Strict TypeScript, naming conventions enforced (`camelCase`/`PascalCase`), `import/no-default-export` rule (off for configs only)
- **Prettier**: Single quotes, trailing commas, 100 char width
- **Pre-commit**: Husky + lint-staged runs ESLint + Prettier
- **Tests**: Vitest with jsdom, coverage thresholds at 30% (statements/branches/functions/lines)
- **Deps**: Knip detects unused dependencies

## Entrypoints & Structure

```
src/
  main.tsx          # Vite entry
  App.tsx           # React Router setup
  firebase.ts       # Firebase client init
  pages/            # Home, Trips, TripDetail, Admin, About
  components/       # Map/, PhotoGallery, ElevationChart, etc.
  utils/            # api.ts, admin.ts, mapUtils.ts, etc.
  types/index.ts    # Shared types
functions/
  src/index.ts      # Functions entry (Express app)
  src/dev-server.ts # Local dev server (:5001)
```

## Important Files

- `spec.md` — Original product requirements (read before feature decisions)
- `TODO.md` — Active issues/fixes (mobile viewport, touch events, 3D map deprecation warnings)
- `firebase.json` — Hosting rewrites: `/api/**` → Cloud Function, rest → SPA

## Testing Conventions

- Unit tests alongside source (`Component.test.tsx` next to `Component.tsx`)
- Test setup in `src/test/setup.ts`
- Coverage enforced at 30% minimum
- **Always verify UI in browser** — use Chrome DevTools MCP tools after visual changes

## Deployment Notes

- `firebase.json` predeploy hook builds functions automatically
- Frontend built to `dist/`, served as static hosting
- Functions served at `/api/*` via rewrite rules

## Environment Variables

Required in `.env`:
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- `VITE_GOOGLE_MAPS_API_KEY`, `VITE_FIREBASE_CONFIG`, `VITE_ADMIN_KEY`, `VITE_SENTRY_DSN`
