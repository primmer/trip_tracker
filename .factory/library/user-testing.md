# User Testing

## Validation Surface

- **Primary surface**: Chrome browser via Chrome DevTools MCP (`chrome-devtools___*` tools)
- **URL**: `http://localhost:5173/trip/:tripId` (Vite dev server)
- **Test trip URL**: `http://localhost:5173/trip/marin_headlands_hawk_and_haypress_camps` (multi-day, 3 rides, geolocated photos)
- **Desktop viewport**: 1440x900
- **Mobile viewport**: 390x844

## Required Testing Tools

- Chrome DevTools MCP (`chrome-devtools___*` tools) — this is the PRIMARY validation tool
- Shell commands ONLY for build/typecheck/lint/test gates (VAL-MAP3D-016 through 019)

## CRITICAL: How Visual Assertions Must Be Validated

**Every browser assertion (VAL-MAP3D-001 through 015, VAL-MOBILE-*, VAL-CROSS-*) MUST be validated by actually interacting with the app in Chrome via DevTools MCP.** Curling localhost or checking service health is NOT validation. The validator must:

1. **Navigate to the test trip page**: `chrome-devtools___navigate_page` to `http://localhost:5173/trip/marin_headlands_hawk_and_haypress_camps`
2. **Wait for map to load**: `chrome-devtools___wait_for` with text like "Ride 1" or "All" (ride selector pills)
3. **Set viewport**: `chrome-devtools___resize_page` to 1440x900 (desktop) or 390x844 (mobile) as needed
4. **Take screenshots**: `chrome-devtools___take_screenshot` with format="jpeg" and quality=70 (PNG can exceed 5MB)
5. **Take DOM snapshots**: `chrome-devtools___take_snapshot` to verify elements exist
6. **Click elements**: `chrome-devtools___click` on ride selectors, photo markers, play buttons, etc.
7. **Evaluate DOM state**: `chrome-devtools___evaluate_script` to read element dimensions, computed styles, camera position, element counts
8. **Check console errors**: `chrome-devtools___list_console_messages` with types=["error"] to find app errors

### Step-by-Step Visual Validation Flow

For map3d-core assertions, the flow validator should execute this sequence:

**Phase 1: Initial Load (VAL-MAP3D-001, 002, 010, CROSS-010)**
- Navigate to test trip URL
- Wait for ride selector to appear ("All", "Ride 1")
- Resize to 1440x900
- Take screenshot — verify: satellite imagery visible, 3D terrain (not flat), all route polylines in frame
- Take snapshot — verify: `gmp-map-3d` map region exists (not `gmp-map`)
- evaluate_script: count `gmp-polyline-3d` elements (should be ≥2), count `gmp-marker-3d` elements (should be ≥1 if photos exist)

**Phase 2: Polyline Highlighting (VAL-MAP3D-003, 004)**
- Click "Ride 1" button
- Wait 1-2 seconds for camera transition
- Take screenshot — verify: map re-framed to smaller area, one polyline prominent, others faded
- Take snapshot — verify stats updated (distance/elevation/duration changed from "All" view)

**Phase 3: Photo Markers (VAL-MAP3D-005, 006, CROSS-013)**
- Click "All" to show all rides
- evaluate_script: `document.querySelectorAll('gmp-marker-3d').length` — should be >0 for trips with photos
- Take screenshot — verify: circular photo thumbnails visible on map (NOT just Google Maps POI labels)
- If photo markers visible: click one → take screenshot → verify dimmed preview overlay appears
- Click outside preview → verify overlay dismisses

**Phase 4: Scrub Marker (VAL-MAP3D-007)**
- Hover over the elevation chart SVG element at ~50% width
- Take screenshot — verify: a dot marker visible on the map along the route
- Move hover off chart
- Take screenshot — verify: scrub marker gone

**Phase 5: Animation (VAL-MAP3D-008, 009)**
- Click "Ride 1" pill first (animation needs a single ride)
- Click Play button
- Wait 2 seconds, take screenshot — verify: animation dot visible on route
- Click Pause, take screenshot — verify: dot stopped
- Click speed toggle, click Play again — verify: button state changed

**Phase 6: Bottom Overlay (VAL-MAP3D-013, 014, 015)**
- Resize to 1440x900
- Take screenshot focused on bottom area — verify: elevation chart, stats, ride pills, play/pause all visible
- evaluate_script: check `pointer-events` computed style on overlay container (should be 'none')
- Resize to 390x844 — take screenshot — verify: overlay responsive, stats readable, no overflow

**Phase 7: Map Interaction (VAL-MAP3D-014, 015)**
- evaluate_script: read map camera center coordinates
- Programmatically trigger a small camera change or verify that map interaction controls exist in snapshot

**Phase 8: Console Errors (VAL-CROSS-017)**
- list_console_messages types=["error"] — report count and unique error messages
- Separate Google Maps API noise from application errors

### What COUNTS as Evidence

For each assertion, the validator must collect:
- **Screenshots** (jpeg, quality=70) showing the visual state
- **DOM snapshots** confirming element presence/absence
- **evaluate_script results** for measurements (dimensions, counts, styles)
- **Console error listings** for error-free assertions

A validator that only runs curl/shell commands has NOT validated any browser assertion. Those assertions must be marked "blocked" (not "passed") if Chrome DevTools was unavailable.

## Validation Concurrency

- **Machine**: 64GB RAM, 18 CPU cores
- **Max concurrent validators**: 1 (Chrome DevTools MCP is single-browser)

## Testing Notes

- 3D terrain requires actual map tile loading — needs network access to Google Maps API
- The `gmp-map-3d` custom element can be detected in DOM snapshots to confirm Map3D is rendering
- Before-screenshots are in `.factory/plans/` for visual baseline comparison
- Screenshots must use format="jpeg" quality=70 — PNG of the 3D map can exceed the 5MB read limit
- If Chrome DevTools MCP reports "Not connected" or "chrome-profile already in use", the validator MUST return to orchestrator as blocked — do NOT mark assertions as passed
- Some map marker nodes in the accessibility tree may be non-interactive in MCP click calls; when this happens, record the exact uid/timeouts and keep the assertion as fail/blocked with evidence.
- Speed toggle may render as icon-only; if explicit `1x/2x` text is unavailable, capture before/after control state and include a clear limitation note in the assertion result.

## Flow Validator Guidance: shell

- Use repo-root commands only (`npm run typecheck`, `npm run lint`, `npx vite build`, `npx vitest run`)
- Do not install/uninstall packages during validation

## Flow Validator Guidance: chrome-devtools

- Isolation boundary: use only `http://localhost:5173/trip/marin_headlands_hawk_and_haypress_camps` and do not navigate to unrelated surfaces.
- Single-session policy: run one validator at a time on this surface (max concurrency = 1) to avoid MCP contention.
- Evidence policy: each assertion must include screenshot/snapshot/evaluate_script evidence; if browser tools are unavailable, mark blocked and record the concrete MCP error text.
- Do not modify app code, service ports, or backend state from browser validation flows.
