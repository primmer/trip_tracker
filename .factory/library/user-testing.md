# User Testing

Testing surface: tools, URLs, setup steps, isolation notes, known quirks.

**What belongs here:** How to manually test the app, URLs, tools available, test accounts, setup steps.

---

## Testing Surface
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Cloud Functions**: http://localhost:5001 (local functions)
- **Firestore**: Real hosted instance on GCP project `primco-trip-tracker`

## Tools Available
- **agent-browser**: Full browser automation (navigate, click, screenshot, snapshot, form fill)
- **curl**: API endpoint testing
- **Vitest**: Automated test runner

## Setup Steps for Manual Testing
1. Start frontend: `npm run dev` (port 5173)
2. Start functions: `cd functions && npm run dev` (port 5001)
3. Ensure `.env` is populated with API credentials

## Known Quirks
- Google Photos Picker requires a real Google OAuth flow; cannot be fully automated in testing
- Strava API has rate limits (100 req/15min); sync should be cached
- Port 5000 is taken by macOS AirPlay -- do not use
- Firestore is a live instance; test data persists between sessions
- Browser automation sessions may include unrelated tabs; collect evidence only from dedicated `localhost:5173`/`localhost:5001` tabs.
- Functions dev server mounts routes at both `/api/*` and root for compatibility; prefer `/api/...` in frontend/tests to avoid accidental `/api/api/...` calls during manual curl checks.

## Test Data
- Strava activity tagged `#otb` on 2026-03-15 (single ride)
- Two Strava activities tagged `#hmb_jul4` (multi-day trip)

## Flow Validator Guidance: foundation-web-api
- Surface scope: foundation milestone smoke checks for SPA shell/routing/build-secrets scan and functions health endpoint.
- Isolation: use read-only checks only (page navigation, console/network inspection, `curl`, and `npm run build` + grep scan). Do not mutate Firestore/Storage data.
- Shared-state boundaries: do not change `.env`, do not run deployment commands, do not write outside `.factory/validation/foundation/user-testing/flows/`.
- Service boundaries: frontend must run on `localhost:5173`, functions on `localhost:5001`; avoid port `5000`.
- Failure policy: if a prerequisite service cannot start or endpoint is unreachable, mark only directly affected assertions as `fail`/`blocked` with concrete error output.

## Flow Validator Guidance: strava-integration-web-api
- Surface scope: strava integration milestone checks for sync persistence, hashtag grouping, streams persistence, token refresh behavior, and trip-list UI states.
- Isolation: this app has no auth and uses shared Firestore + Strava account, so run validator flows sequentially to avoid concurrent sync interference/rate-limit contention.
- Assigned namespaces for evidence only: `strava_ui_flow_ns` and `strava_api_flow_ns`; each flow must write only to its own report JSON path.
- Shared-state boundaries: do not edit `.env`, do not deploy, do not modify application source; limit writes to app behavior under test (normal sync endpoint writes) and `.factory/validation/strava-integration/user-testing/flows/` outputs.
- Service boundaries: frontend `http://localhost:5173`, functions `http://localhost:5001`; never use port `5000`.
- Failure policy: if prerequisite sync/setup fails, mark only dependent assertions as blocked with concrete command/snapshot evidence.
