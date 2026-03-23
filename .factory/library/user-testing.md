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

## Test Data
- Strava activity tagged `#otb` on 2026-03-15 (single ride)
- Two Strava activities tagged `#hmb_jul4` (multi-day trip)
