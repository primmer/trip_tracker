---
name: frontend-worker
description: Implements React/TypeScript frontend features with Chrome DevTools visual verification
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Frontend features: React component changes, CSS/Tailwind responsive adjustments, Google Maps API migration, TypeScript refactoring. All work in this mission is frontend-only (no backend/functions changes).

## Required Skills

None. Workers use Chrome DevTools MCP tools (`chrome-devtools___*`) directly for visual verification.

## Work Procedure

1. **Read the mission plan**: Read `.factory/plans/3d-terrain-map3d-refactor.md` thoroughly. It contains detailed migration guidance, API mappings, code examples, and known gotchas. This is your primary reference — do not deviate from its approach without good reason.

2. **Read architecture**: Read `.factory/library/architecture.md` for component hierarchy and data flow.

3. **Understand the feature**: Read the feature description, preconditions, expectedBehavior, and verificationSteps carefully. Identify which files need modification.

4. **Read current source**: Read every file you will modify. Understand the existing patterns, imports, and data flow before writing any code.

5. **Write tests first (if applicable)**: For logic changes (e.g., calculateRangeFromBounds utility), write a failing test first, then implement. For pure visual/component swaps where testing is via Chrome DevTools, proceed to implementation.

6. **Implement incrementally**: Make changes file by file. After each file:
   - Run `npm run typecheck` to catch type errors immediately
   - Fix any errors before moving to the next file

7. **Run all automated checks**:
   ```
   npm run typecheck
   npm run lint
   npx vitest run
   npx vite build
   ```
   All must pass with zero errors. Fix any failures.

8. **Visual verification via Chrome DevTools MCP** (MANDATORY — do NOT use Playwright, agent-browser, or any other browser tool):
   - Use ONLY `chrome-devtools___*` tools. Never fall back to Playwright or agent-browser.
   - Navigate: `chrome-devtools___navigate_page` to `http://localhost:5173/trip/marin_headlands_hawk_and_haypress_camps`
   - Wait for content: `chrome-devtools___wait_for` with text ["Ride 1"] to confirm page loaded
   - Set viewport: `chrome-devtools___resize_page` to 1440x900 (desktop) or 390x844 (mobile)
   - Screenshots: `chrome-devtools___take_screenshot` with format="jpeg" quality=70 (PNG can exceed 5MB)
   - DOM verification: `chrome-devtools___take_snapshot` to confirm elements exist
   - Element properties: `chrome-devtools___evaluate_script` for dimensions, counts, styles
   - Click elements: `chrome-devtools___click` on ride selectors, markers, buttons
   - Console errors: `chrome-devtools___list_console_messages` with types=["error"]
   - If Chrome DevTools MCP fails to connect, RETURN TO ORCHESTRATOR immediately. Do not use alternative tools.
   - **FAST-FAIL RULE**: If you make a visual change but cannot take a screenshot to confirm it looks correct, STOP and return to orchestrator. Never claim visual work is done without screenshot proof. DOM presence alone is NOT visual verification — elements can exist in DOM but render incorrectly (wrong size, invisible, off-screen). You must LOOK at the screenshot and confirm the visual result matches expectations.

9. **Commit with jj**: Use `jj describe -m "..."` then `jj new` to checkpoint. NEVER use git commands.

## Example Handoff

```json
{
  "salientSummary": "Replaced <Map> with <Map3D> in TripMap.tsx, rewrote RoutePolylines to use declarative <Polyline3D> with CLAMP_TO_GROUND, implemented calculateRangeFromBounds utility for auto-zoom, replaced legacy <Marker> with <Marker3D> HTML children for scrub/animation dots. All 4 automated checks pass (typecheck, lint, test, build). Chrome DevTools screenshots at 1440x900 confirm 3D terrain relief visible when tilted, polylines following terrain contour, and bottom overlay intact.",
  "whatWasImplemented": "Map3D container with range-based camera model, Polyline3D route rendering with terrain clamping, Marker3D scrub/animation dots with HTML circle children, calculateRangeFromBounds utility using geometry.spherical.computeDistanceBetween, MapAutoZoom rewrite using flyCameraTo for smooth transitions, removed SetInitialMapType (Map3D has no map type switching), updated TripMapProps to remove MapProps extension",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "npm run typecheck", "exitCode": 0, "observation": "No type errors"},
      {"command": "npm run lint", "exitCode": 0, "observation": "No warnings"},
      {"command": "npx vitest run", "exitCode": 0, "observation": "All 5 tests passed"},
      {"command": "npx vite build", "exitCode": 0, "observation": "Build succeeded, 287KB gzipped"}
    ],
    "interactiveChecks": [
      {"action": "Navigated to /trip/hmb_jul4 at 1440x900, tilted map", "observed": "Mountains show visible 3D terrain relief with shadows. Satellite imagery draped over terrain. Not flat."},
      {"action": "Checked route polylines at tilt angle", "observed": "Blue and red polylines visible, following terrain contour. No floating or clipping through ridges."},
      {"action": "Clicked 'Ride 1' pill", "observed": "Ride 1 polyline at full opacity, Ride 2 dimmed. Map re-framed smoothly to Ride 1 bounds."},
      {"action": "Scrubbed elevation chart", "observed": "White dot with blue stroke appeared on map at correct GPS position, moved along route with scrub."},
      {"action": "Resized to 390x844", "observed": "Map fills viewport, bottom overlay responsive, all controls visible."}
    ]
  },
  "tests": {
    "added": [
      {"file": "src/components/Map/__tests__/calculateRange.test.ts", "cases": [
        {"name": "returns range from small bounding box", "verifies": "Range calculation for city-scale bounds"},
        {"name": "returns range from large bounding box", "verifies": "Range calculation for multi-state bounds"},
        {"name": "handles zero-area bounds (single point)", "verifies": "Edge case where all points are the same location"}
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Map3D fails to render (blank/gray globe) despite correct setup — may need API key or Cloud Console investigation
- `useMap3D()` returns null persistently — may indicate library version issue
- Polyline3D or Marker3D components don't exist in the installed library version
- Chrome DevTools MCP cannot connect to the browser
- Type errors that indicate the library's type definitions don't match the documented API
