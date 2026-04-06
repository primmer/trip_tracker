# User Testing

## Validation Surface

- **Primary surface**: Chrome browser via Chrome DevTools MCP (`chrome-devtools___*` tools)
- **URL**: `http://localhost:5173/trip/:tripId` (Vite dev server)
- **Test trip**: Use a multi-day trip with geolocated photos and ≥2 rides (e.g., Marin Headlands)
- **Desktop viewport**: 1440x900
- **Mobile viewport**: 390x844

## Required Testing Tools

- Chrome DevTools MCP (already connected, port 9222)
- Shell commands for build/typecheck/lint/test gates

## Validation Concurrency

- **Machine**: 64GB RAM, 18 CPU cores — very capable
- **Surface**: chrome-devtools — each validator instance uses Chrome DevTools on the same browser
- **Constraint**: Chrome DevTools MCP connects to a single browser instance. Multiple validators sharing the same browser can conflict (page navigation, viewport resizing)
- **Max concurrent validators**: 1 (serialized to avoid conflicts on single browser)

## Testing Notes

- 3D terrain requires actual map tile loading — tests need network access to Google Maps API
- Map3D camera position is verified via `evaluate_script` reading element properties
- The `gmp-map-3d` custom element can be detected in DOM snapshots to confirm Map3D is rendering (not fallback Map)
- Before-screenshots are in `.factory/plans/` for visual baseline comparison
