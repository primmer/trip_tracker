# TODO — Post Map3D Migration Fixes

## 1. Mobile layout issues ✅ FIXED & VERIFIED

- **Files:** `src/components/Layout.tsx`, `src/pages/TripDetail.tsx`
- **Problems:**
  1. Stats row clipped at bottom on mobile - `100vh` didn't account for dynamic browser chrome
  2. Page content could scroll under the top nav bar
  3. Content going under browser chrome when scrolling
- **Fixes:**
  1. Layout uses `h-dvh` (dynamic viewport height) for TripDetail pages to match actual visible area
  2. Layout applies `overflow-hidden` to prevent page-level scrolling on TripDetail
  3. TripDetail uses `h-full` to fill the constrained container
  4. Main content area uses `flex-1 min-h-0` to properly distribute space
- **Deployed:** 2026-04-06
- **Verified:** Map interactions (pan, tilt, zoom) now work with one finger instead of requiring two. Page no longer scrolls independently of map.

## 2. Mobile elevation scrub doesn't work ✅ FIXED

- **File:** `src/components/ElevationChart.tsx` lines 76-91, 131-134
- **Problem:** Only `onMouseMove`/`onMouseLeave` handlers exist. Zero touch event handlers. No `touch-action: none` CSS, so the browser intercepts touch gestures for scrolling.
- **Fix:** Switched to unified `onPointerMove`/`onPointerLeave` handlers (Pointer Events API handles both mouse and touch). Added `touch-action: none` to the chart container style to prevent browser scrolling interference.
- **Deployed:** 2026-04-06

## 3. Expanded map camera controls hidden behind overlay ✅ FIXED

- **Files:** `src/components/Map/TripMap.tsx`, `src/pages/TripDetail.tsx`
- **Problem:** Overlay had `right-[60px]` (only reserves 60px for map controls). When the camera controls expanded, the panel extended beyond 60px and was visually obscured by the dark gradient.
- **Fix:** Used `defaultUIHidden={true}` prop on Map3D component (official Google Maps API) to hide all default UI controls (zoom, tilt, compass). Changed overlay to `right-0` to span full width.
- **Deployed:** 2026-04-06

## 4. Polyline3D `coordinates` deprecated — use `path` ✅ FIXED

- **File:** `src/components/Map/TripMap.tsx` line ~147
- **Problem:** `<gmp-polyline-3d>` logs deprecation warnings: "The `coordinates` property is deprecated. Use `path` instead."
- **Fix:** Changed the property name from `coordinates` to `path` in the useEffect that creates polyline elements. Added type extension `Polyline3DElementWithPath` for TypeScript compatibility.
- **Deployed:** 2026-04-06

## 5. React Router v7 future flag warnings ✅ FIXED

- **File:** `src/App.tsx`
- **Problem:** Two deprecation warnings about `v7_startTransition` and `v7_relativeSplatPath`.
- **Fix:** Added future flags: `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`.
- **Deployed:** 2026-04-06

## 6. map page: polylines are not centered in the view port ✅ FIXED

- **File:** `src/utils/mapUtils.ts`
- **Problem:** The camera range calculation used the full viewport height, causing polylines to be partially hidden under the bottom overlay (elevation chart + stats).
- **Fix:** Instead of shifting the center north (old approach), increased the camera range multiplier from 1.8 to ~2.57 (1.8 / 0.7) to account for the ~30% of viewport consumed by the bottom overlay. This keeps the geometric center centered while ensuring the entire route fits in the visible area.
- **Deployed:** 2026-04-06

## 7. intra-trip segement colors and buttons ✅ FIXED

- **Files:** `src/components/Map/PhotoMarkers.tsx`, `src/pages/TripDetail.tsx`
- **Changes:**
  - Photo marker borders now match their ride's path color (determined by timestamp matching)
  - Ride selector buttons show dimmed color (30% opacity) when off instead of grey
  - 'All' button shows dimmed amber when off
- **Deployed:** 2026-04-06

## 8. multi-ride play buttons ✅ FIXED

- **File:** `src/pages/TripDetail.tsx`
- **Changes:**
  - Consolidated to single play button that plays the selected segment
  - When 'All' selected, plays all rides in sequence automatically
  - Default speed changed from 1x to 4x
  - Speed toggle cycles 4x -> 8x -> 4x
  - Removed speed multiplier text display (icon only)
- **Deployed:** 2026-04-06

## 7. intra-trip segement colors and buttons ✅ FIXED

- **Files:** `src/components/Map/PhotoMarkers.tsx`, `src/pages/TripDetail.tsx`
- **Changes:**
  - Photo marker borders now match their ride's path color (determined by timestamp matching)
  - Ride selector buttons show dimmed color (30% opacity) when off instead of grey
  - 'All' button shows dimmed amber when off
- **Deployed:** Pending

## 8. multi-ride play buttons ✅ FIXED

- **File:** `src/pages/TripDetail.tsx`
- **Changes:**
  - Consolidated to single play button that plays the selected segment
  - Default speed changed from 1x to 2x
  - Speed toggle cycles 2x -> 4x -> 2x
  - Removed speed multiplier text display (icon only)
- **Deployed:** Pending

## Video Support ✅ IMPLEMENTED

- Backend downloads full videos from Google Photos picker using `=dv` URL parameter
- Videos stored in Firebase Storage and `mediaType: 'video'` field in Firestore
- Gallery shows video thumbnails with custom play button overlay (not Google's burned-in one)
- Lightbox renders videos with native `<video>` controls and autoplay
- Videos excluded from tile/hero backgrounds to avoid thumbnail quality issues
- Verified working with actual video import

## Planned: AI-Powered POI & Photo Captions

- Use AI to identify notable points of interest along each activity's GPS route (major landmarks, peaks, ridges, parks) and enrich the activity description with them.
- Optionally generate captions for trip photos using vision AI. Captions should be specific and informative (e.g. "Hawk Camp overlooking Gerbode Valley"), not obvious or generic (e.g. "picture of a bridge"). If the AI can't add meaningful context, skip the caption.
- Goal is to make trip storytelling richer without manual effort. Details on implementation TBD.
