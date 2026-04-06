# Mission: 3D Terrain Map Refactor (Map → Map3D)

## Before Screenshots (Reference Baseline)

These capture the current UX that must be preserved through the refactor. The only visual map difference after the refactor should be that mountains show actual 3D terrain relief when tilted. Note the plan does include an additional fix: Mobile Header Vertical Space.

### Desktop (1440x900)
- `before-desktop-all-rides.jpg` -- All rides selected, multi-color polylines, elevation chart, stats overlay
- `before-desktop-ride1.jpg` -- Ride 1 selected, zoomed to single activity, blue polyline highlighted

### Mobile (390x844, iPhone 15 Pro)
- `before-mobile-all-rides.png` -- All rides, responsive stats/overlay layout
- `before-mobile-ride1.png` -- Ride 1 selected, responsive layout preserved

All screenshots are in `.factory/plans/` alongside this document.

## Problem

The trip detail map tilts but shows flat terrain -- mountains have no height relief. The standard `<Map>` component with vector rendering only supports 3D buildings in urban areas, not terrain elevation. To get actual mountain relief when tilted, we need to switch to the Photorealistic 3D Maps feature via the `<Map3D>` component.

## Pricing Validation

- Billing SKU: "Map Tiles API: Photorealistic 3D Tiles"
- Pay-as-you-go free cap: **1,000 root tileset requests/month**
- Each map load = 1 root tileset request. All tile streaming within a session (up to 3 hours) is unlimited and not separately billed.
- After free cap: $6.00 per 1,000 additional requests
- Current usage: ~288 map loads/month total -- well within 1,000 free cap
- No subscription tier change needed

## Prerequisites

### Google Cloud Console
1. The **Map Tiles API** on the project (`primco-trip-tracker`) is already enabled. This is in addition to the already-enabled **Maps JavaScript API**. Without it, the 3D map will fail to load tiles (black screen).

### Library Upgrade
2. Upgrade `@vis.gl/react-google-maps` from **v1.7.1** to **v1.8.2** (or latest stable). v1.7.1 has 3D type definitions but zero runtime code for Map3D. The runtime `Map3D`, `Marker3D`, and `Polyline3D` components were added in v1.8.0.

```bash
npm install @vis.gl/react-google-maps@^1.8.2
```

### APIProvider
3. In `src/main.tsx`, add `'maps3d'` to the libraries array. This is a **client-side library name** passed to the Maps JavaScript API loader (like `'geometry'`), not a Cloud Console API.

```tsx
// Before
<APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['geometry']}>

// After
<APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['geometry', 'maps3d']}>
```

## Files to Modify

### 1. `src/main.tsx`
- Add `'maps3d'` to APIProvider `libraries` array

### 2. `src/components/Map/TripMap.tsx` (heaviest changes)

**Replace `<Map>` with `<Map3D>`:**
- Import `Map3D` and `useMap3D` instead of `Map` and `useMap`
- `Map3D` uses a different camera model:
  - No `zoom` -- uses `range` (distance from camera to center point in meters) and `altitude` (elevation of the center point)
  - No `center` -- uses `center` with `{lat, lng, altitude}` (3-value object)
  - `defaultTilt` and `defaultHeading` still exist
  - No `mapId`, no `renderingType`, no `mapTypeControl`, no `zoomControl` -- Map3D has its own built-in controls
  - No `gestureHandling` -- Map3D always supports full 3D interaction (pan, zoom, tilt, rotate)
  - `mode="hybrid"` is required for satellite imagery (was a breaking change that the library handles)
- Remove `<SetInitialMapType>` -- Map3D doesn't have separate map types; use `mode` prop instead
- Remove `backgroundColor` prop (not supported on Map3D)

**Camera model mapping guide:**
- `defaultZoom: 2` → `defaultRange: 20000000` (very far out, world view, not desired)
- For fitted bounds: calculate range from the bounding box diagonal distance. Rough formula: `range = boundsSpanMeters * 1.5`

**Replace `RoutePolylines` (uses `google.maps.Polyline`):**

Option A -- Use `<Polyline3D>` from the library (preferred if API is stable):
```tsx
import { Polyline3D } from '@vis.gl/react-google-maps';

// Inside Map3D children:
<Polyline3D
  coordinates={path.map(({lat, lng}) => ({lat, lng, altitude: 0}))}
  strokeColor={color}
  strokeWidth={5}
  altitudeMode="CLAMP_TO_GROUND"
/>
```

Option B -- Use the native `google.maps.maps3d.Polyline3DElement` custom element directly if the React wrapper has issues.

Note: `altitudeMode: "CLAMP_TO_GROUND"` makes the polyline follow terrain surface. This is critical -- without it, polylines will float or clip through mountains.

**Replace scrub/animation `<Marker>` components:**
- The current `<Marker>` with `google.maps.SymbolPath.CIRCLE` icon won't work in Map3D
- Replace with `<Marker3D>` from the library
- Marker3D uses `position={{lat, lng, altitude}}` and `altitudeMode="CLAMP_TO_GROUND"`
- For the visual dot, use an HTML child element (colored div with border-radius) since Marker3D supports arbitrary HTML content like AdvancedMarker

**Replace `MapAutoZoom`:**
- `useMap()` → `useMap3D()`
- `map.fitBounds()` does not exist on Map3D
- Must calculate camera position manually from bounds:
  1. Compute bounding box of all activity latlngs
  2. Compute the center lat/lng of the bounding box
  3. Compute the diagonal span in meters (use `google.maps.geometry.spherical.computeDistanceBetween`)
  4. Set `range` to roughly `diagonalSpan * 0.8` (adjust multiplier for good framing with the bottom overlay)
  5. Use `map3d.flyCameraTo()` or set center/range props directly
- The `flyCameraTo()` method provides smooth animated transitions between views (nice UX improvement over the abrupt `fitBounds`)

### 3. `src/components/Map/PhotoMarkers.tsx`
- Replace `<AdvancedMarker>` with `<Marker3D>`
- `useMap()` → `useMap3D()`
- `position` gains an `altitude` field: `{lat, lng, altitude: 0}`
- `altitudeMode="CLAMP_TO_GROUND"` so markers sit on terrain
- The HTML children (circular thumbnail div) should work as-is inside `<Marker3D>` since it supports custom HTML content

### 4. `src/components/Map/RouteAnimation.tsx`
- `useMap()` → `useMap3D()`
- `map.panTo(point)` → Use `map3d.flyCameraTo()` or update the center prop
- The `flyCameraTo()` method can animate smoothly, but may be too slow for frame-by-frame animation. Alternative: directly set `map3d.center` property for immediate updates
- The animation marker itself is rendered in TripMap.tsx (see item 2 above)

### 5. `src/components/Map/routeColors.ts`
- No changes needed

### 6. `src/pages/TripDetail.tsx`
- Update the `TripMap` usage if any props change signature (e.g., if we remove `MapProps` spread)
- The `scrubPosition` prop may need `altitude` added: `{lat, lng, altitude: 0}`

## What NOT to Change

- `src/components/ElevationChart.tsx` -- untouched, it's pure SVG
- `src/components/StaticMap.tsx` -- uses static maps API, unrelated
- `src/components/RouteOverlay.tsx` -- SVG polyline overlays on homepage/tiles, unrelated
- `src/utils/interpolation.ts` -- pure math, uses `google.maps.geometry.spherical` which is still loaded via the `'geometry'` library
- The bottom overlay (elevation chart, stats, ride selector, animation controls) -- all untouched, they sit on top of the map via CSS

## Known Risks and Gotchas

1. **`flyCameraTo()` vs `fitBounds()`**: Map3D has no `fitBounds()`. The auto-zoom logic must be rewritten to calculate range from bounds. This is the trickiest part. Consider a utility function like:
   ```ts
   function calculateRangeFromBounds(bounds: google.maps.LatLngBounds): number {
     const ne = bounds.getNorthEast();
     const sw = bounds.getSouthWest();
     const diagonal = google.maps.geometry.spherical.computeDistanceBetween(
       new google.maps.LatLng(ne.lat(), ne.lng()),
       new google.maps.LatLng(sw.lat(), sw.lng())
     );
     return diagonal * 0.8;
   }
   ```

2. **Map3D mode prop**: As of early 2025, Google changed the 3D Maps API to require `mode="hybrid"` for satellite imagery. The `@vis.gl/react-google-maps` library handles this, but verify it renders satellite (not a blank gray globe).

3. **Polyline3D altitude mode**: Must use `CLAMP_TO_GROUND` for route polylines. Using `ABSOLUTE` with altitude 0 will put lines at sea level, cutting through mountains.

4. **No `mapTypeControl`**: Map3D doesn't support switching between roadmap/satellite/terrain. It's always photorealistic 3D. This is fine for the trip detail page (which was already locked to hybrid/satellite).

5. **Google Maps right-side controls**: Map3D has its own compass and zoom controls. The current bottom overlay is positioned to avoid the right-side controls. Verify this still works, adjust CSS if needed.

6. **`useMap3D()` hook**: Returns a `Map3DElement` reference. Unlike `useMap()` which returns a `google.maps.Map`, the Map3D element is a custom HTML element (`gmp-map-3d`). Methods and properties differ. Check the [API reference](https://developers.google.com/maps/documentation/javascript/reference/3d-map).

7. **Library version**: v1.8.0 just went stable on March 26, 2026. Polyline3D/Marker3D wrappers are new. Be prepared for potential rough edges -- check the [GitHub issues](https://github.com/visgl/react-google-maps/issues) if something doesn't render.

## Validation Criteria

### V1: 3D Terrain Renders
- Navigate to a mountain trip (e.g., Marin Headlands)
- Tilt the map by holding Ctrl+drag (or two-finger tilt on mobile)
- **Mountains must show visible height relief** -- terrain should NOT be flat
- Satellite imagery is visible (not a gray/blank globe)

### V2: Route Polylines Follow Terrain
- Route polylines are visible on the 3D map
- Polylines follow the terrain surface (clamped to ground)
- Polylines do NOT float above mountains or clip through them
- Multi-activity trips show different colors per ride (ROUTE_COLORS still applied)
- Selecting a ride highlights that polyline and dims others

### V3: Photo Markers Work
- Photo thumbnail markers appear on the map at correct positions
- Clicking a photo marker triggers the preview overlay
- Markers sit on the terrain surface (not floating in air)

### V4: Scrub Marker Works
- Scrubbing the elevation chart places a dot on the map
- The dot appears at the correct GPS position on the route
- The dot sits on the terrain surface

### V5: Route Animation Works
- Play button starts animation dot moving along the route
- Camera follows the animation dot
- Speed controls (1x/2x) work
- Animation completes and resets

### V6: Auto-Zoom / View Fitting
- On page load, camera frames all activities with appropriate range
- Switching rides re-frames to that single activity
- Switching to "All" re-frames to all activities
- Transitions are smooth (using flyCameraTo if available)

### V7: Photo Filtering by Ride
- When a specific ride is selected, only photos from that ride's time window appear
- When "All" is selected, all geolocated photos appear
- (This was implemented in the previous session and should still work)

### V8: Bottom Overlay Not Broken
- Elevation chart, stats, ride selector, and animation controls all render correctly
- Gradient overlay doesn't block map interaction (previous fix preserved)
- Mobile responsive sizing still works

### V9: Build and Types
- `npx tsc --noEmit` passes with no errors
- `npx eslint src/` passes with no errors
- `npx vite build` succeeds
- Existing tests pass (some map-related tests may need mock updates for Map3D)

### V10: Visual Verification
- Use Chrome DevTools MCP to take screenshots on both desktop and mobile (390x844) viewports
- Compare against current behavior: same polyline colors, same overlay layout, but now with 3D terrain

## Additional Fix: Mobile Header Vertical Space

As visible in the before-mobile screenshots, the title/heading area consumes over 30% of the viewport on narrow screens. This wastes valuable map real estate. Fix this as part of the same mission.

### File: `src/pages/TripDetail.tsx`

**Approach options (use judgment, combine as needed):**
- Reduce heading font size on mobile (e.g., `text-2xl sm:text-4xl` or similar)
- Reduce vertical padding/margins around the title block
- Collapse the date line into a smaller inline element
- Make the Map/Gallery toggle buttons smaller on mobile
- Reduce gap between the back arrow, title, and tab buttons
- Consider a single-line layout for shorter trip names on mobile

**Goal:** The heading area should take no more than ~15-20% of the mobile viewport, giving the map the maximum possible space.

### Validation: V11 -- Mobile Header Compact
- On mobile (390x844), the heading/title area (from top of page to start of map) should be visually compact
- All content still readable: trip name, dates, Map/Gallery tabs, back arrow
- Compare before-mobile screenshots to confirm improvement
- Desktop layout should remain unchanged or only minimally affected

## Estimated Scope

- ~6 files modified, ~1 new utility function
- Heaviest change: TripMap.tsx (full rewrite of map container, polylines, markers, auto-zoom)
- Medium: PhotoMarkers.tsx, RouteAnimation.tsx (swap hooks and components)
- Light: main.tsx (one line), TripDetail.tsx (3D prop adjustments + mobile header compact)
- New: bounds-to-range utility function (either in TripMap.tsx or a shared util)
