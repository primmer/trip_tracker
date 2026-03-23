---
name: fullstack-worker
description: Implements fullstack features spanning React frontend, Firebase Cloud Functions, Firestore, and external API integrations.
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that involve any combination of:
- React UI components (pages, components, hooks)
- Firebase Cloud Functions (API endpoints, background tasks)
- Firestore schema/data operations
- Firebase Storage operations
- Google Maps integration
- External API integrations (Strava, Google Photos Picker, Geocoding/Places)

## Work Procedure

### 1. Read Context

- Read `AGENTS.md` for mission boundaries, coding conventions, and API notes
- Read `.factory/library/architecture.md` for project structure and patterns
- Read `.factory/library/environment.md` for env vars and API details
- Read relevant research files in `.factory/research/` for the APIs this feature touches
- Read the feature's `preconditions`, `expectedBehavior`, and `verificationSteps`

### 2. Plan Implementation

Before writing code, identify:
- Which files need to be created or modified
- What types/interfaces are needed
- What tests should be written
- Whether Cloud Functions or frontend-only changes are needed

### 3. Write Tests First (TDD)

Write failing tests BEFORE implementation:
- **Utility functions**: Vitest unit tests (e.g., hashtag parsing, unit conversion, timestamp matching)
- **React components**: Vitest + React Testing Library (rendering, interaction, state)
- **Cloud Functions**: Vitest with mocked Firebase Admin SDK
- Run tests to confirm they FAIL (red phase)

### 4. Implement

- Follow the architecture in `.factory/library/architecture.md`
- Frontend code in `src/`, Cloud Functions in `functions/src/`
- Use TypeScript strict mode
- Named exports only
- Keep secrets server-side (Cloud Functions); only `VITE_` prefixed vars in frontend
- Install new dependencies with `npm install <package>` (frontend) or `cd functions && npm install <package>` (backend)

### 5. Make Tests Pass (Green Phase)

- Run `npx vitest run` to verify all tests pass
- Fix implementation until green

### 6. Run Validators

Run ALL of these and fix any issues:
```
npm run typecheck
npm run lint
npx vitest run --reporter=verbose
```

### 7. Manual Verification

Start the dev server and verify the feature works interactively:
- Start frontend: `npm run dev` (port 5173)
- Start functions if needed: `cd functions && npm run dev` (port 5001)
- Use agent-browser to navigate to http://localhost:5173 and verify the feature
- Use curl to test API endpoints
- Each verification = one `interactiveChecks` entry with specific action and observation

Stop all processes you started before completing.

### 8. Commit

Commit with a descriptive message covering what was built and tested.

## Example Handoff

```json
{
  "salientSummary": "Implemented Strava sync Cloud Function (POST /api/sync) that fetches activities, parses hashtags from descriptions, creates trip groupings, and caches to Firestore. Wrote 6 unit tests covering hashtag parsing, trip grouping, and token refresh. Verified via curl (200 response, 3 activities synced) and agent-browser (trip list shows #hmb_jul4 with 2 rides, #otb with 1 ride).",
  "whatWasImplemented": "Cloud Function POST /api/sync endpoint that calls Strava /athlete/activities, extracts hashtags from descriptions, groups activities into trips by hashtag, and writes trip + activity documents to Firestore. Frontend TripList component that reads trips from Firestore and displays name, date range, and activity count. Sync button with loading indicator.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vitest run --reporter=verbose", "exitCode": 0, "observation": "6 tests passed: parseHashtags (3 cases), groupActivitiesByTrip (2 cases), refreshStravaToken (1 case)" },
      { "command": "npm run typecheck", "exitCode": 0, "observation": "No errors" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No warnings or errors" },
      { "command": "curl -X POST http://localhost:5001/api/sync", "exitCode": 0, "observation": "200 OK, response: {synced: 3, trips: 2}" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to http://localhost:5173, click Sync button", "observed": "Loading spinner shown, trip list populated after 3 seconds with 2 trips" },
      { "action": "Check trip list entries", "observed": "#hmb_jul4 shows Jul 4-5 (2 rides), #otb shows Mar 15 (1 ride)" },
      { "action": "Verify console has no errors", "observed": "Console clean, no uncaught errors" }
    ]
  },
  "tests": {
    "added": [
      { "file": "src/utils/__tests__/hashtag.test.ts", "cases": [
        { "name": "extracts single hashtag", "verifies": "parseHashtags('#otb something') returns ['otb']" },
        { "name": "extracts multiple hashtags", "verifies": "parseHashtags('#trip1 text #trip2') returns ['trip1', 'trip2']" },
        { "name": "returns empty for no hashtags", "verifies": "parseHashtags('no tags here') returns []" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a Cloud Function endpoint or Firestore collection that doesn't exist yet
- External API (Strava, Google) returns unexpected errors that suggest a credential or scope issue
- The Google Photos Picker flow cannot be completed due to OAuth issues
- Requirements are ambiguous or contradictory
- Existing bugs in other features block this feature's implementation
- Cannot install required dependencies
