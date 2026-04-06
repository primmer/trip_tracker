# TODO — Post Map3D Migration Fixes

## 1. Mobile stats require scroll
- **File:** `src/pages/TripDetail.tsx` line 546
- **Problem:** `h-[calc(100vh-65px)]` — `100vh` on mobile browsers equals the largest possible viewport (URL bar hidden), not the actual visible area. Stats row at `bottom-5` gets clipped.
- **Fix:** Change to `h-[calc(100dvh-65px)]` (dynamic viewport height). Add fallback for older browsers if needed.

## 2. Mobile elevation scrub doesn't work
- **File:** `src/components/ElevationChart.tsx` lines 75-90, 131-134
- **Problem:** Only `onMouseMove`/`onMouseLeave` handlers exist. Zero touch event handlers. No `touch-action: none` CSS, so the browser intercepts touch gestures for scrolling.
- **Fix:** Add `onTouchStart`/`onTouchMove`/`onTouchEnd` handlers using `e.touches[0].clientX`, or switch to unified `onPointerMove`/`onPointerLeave`. Add `touch-action: none` to the chart container.

## 3. Expanded map camera controls hidden behind overlay
- **File:** `src/pages/TripDetail.tsx` line 661
- **Problem:** Overlay has `right-[60px]` (only reserves 60px for map controls) and `z-10` with opaque gradient `from-black/90`. When the camera controls expand, the panel extends well beyond 60px and is visually obscured by the dark gradient.
- **Fix:** Increase `right-[60px]` to accommodate the expanded panel (~120-150px), or reposition the overlay to avoid the controls area, or reduce gradient opacity in that zone.

## 4. Polyline3D `coordinates` deprecated — use `path`
- **File:** `src/components/Map/TripMap.tsx` line ~142
- **Problem:** `<gmp-polyline-3d>` logs deprecation warnings: "The `coordinates` property is deprecated. Use `path` instead."
- **Fix:** Change the property name from `coordinates` to `path` in the useEffect that creates polyline elements.

## 5. React Router v7 future flag warnings
- **File:** Where `<BrowserRouter>` is created (likely `src/main.tsx` or `src/App.tsx`)
- **Problem:** Two deprecation warnings about `v7_startTransition` and `v7_relativeSplatPath`.
- **Fix:** Add future flags: `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`. Or upgrade to React Router v7.


## Planned: Video Support

- The Google Photos picker can return videos (mime type `video/mp4`). Currently the backend downloads the video thumbnail bytes only (Size 427,675 bytes Type

  video/mp4) and displays the thumbnail. Need to either skip videos during import or properly handle them -- download and render with a `<video>` element in the gallery/lightbox instead of `<img>`. Also, do not use them as thumbnails for tile backgrounds or hero images -- their thumb has a play button burned in.

## Planned: AI-Powered POI & Photo Captions

- Use AI to identify notable points of interest along each activity's GPS route (major landmarks, peaks, ridges, parks) and enrich the activity description with them.
- Optionally generate captions for trip photos using vision AI. Captions should be specific and informative (e.g. "Hawk Camp overlooking Gerbode Valley"), not obvious or generic (e.g. "picture of a bridge"). If the AI can't add meaningful context, skip the caption.
- Goal is to make trip storytelling richer without manual effort. Details on implementation TBD.
