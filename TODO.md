# TODO

## Planned: AI-Powered POI & Photo Captions

- Use AI to identify notable points of interest along each activity's GPS route (major landmarks, peaks, ridges, parks) and enrich the activity description with them.
- Optionally generate captions for trip photos using vision AI. Captions should be specific and informative (e.g. "Hawk Camp overlooking Gerbode Valley"), not obvious or generic (e.g. "picture of a bridge"). If the AI can't add meaningful context, skip the caption.
- Goal is to make trip storytelling richer without manual effort. Details on implementation TBD.

## Firebase analytics - ✅ COMPLETED

Firebase Analytics has been implemented with comprehensive event tracking across the app.

### Implementation Details

**Files Modified:**

- `src/firebase.ts` - Added Analytics initialization and tracking utilities
- `src/utils/analytics.ts` - New module with typed analytics events and helper functions
- `src/App.tsx` - Page view tracking on route changes
- `src/pages/Home.tsx` - Trip card click tracking
- `src/pages/Trips.tsx` - Trip card click tracking
- `src/pages/TripDetail.tsx` - Trip views, photo gallery, map interactions, route animation
- `src/pages/Admin.tsx` - Admin sync actions

### Tracked Events

**Page Views:**

- `page_view` - All page navigations

**Trip Interactions:**

- `trip_view` - When a trip detail page is loaded
- `trip_card_click` - When a trip card is clicked (home or trips page)

**Photo Interactions:**

- `photo_gallery_open` - When photo gallery is opened
- `photo_navigate` - When navigating between photos in lightbox

**Map Interactions:**

- `map_marker_click` - When a photo marker on the map is clicked
- `map_route_animation` - When route animation is played/paused

**Admin Actions:**

- `admin_sync_strava` - When Strava sync is triggered
- `admin_photo_picker_open` - When photo picker is opened
- `admin_photo_assigned` - When photos are assigned to a trip

## UI: Rotate trip background images

Trip cards on the home page and trips page currently use a static background image (the first photo in the trip). We should rotate through all available trip photos so the thumbnail feels alive and gives a better preview of the trip content.

- **Scope:** Home page trip grid + Trips page trip grid
- **Behavior:** Cycle through trip photos every N seconds (or on hover). Graceful fallback to the first photo if only one exists.
- **Considerations:** Avoid layout shift; use `object-fit: cover` consistently. Preload adjacent images for smooth transitions.

## Pre-existing ESLint errors

The following errors currently fail `npm run lint`. They appear to have been introduced by a previous agent and need cleanup:

- `functions/src/router.ts:610` — `no-inner-declarations`: `fetchActivityWithRetry` is declared inside another function body. Move it to module scope.
- `src/components/Map/TripMap.tsx:59` — `apiIsLoaded` is assigned but never used. Remove or use.
- `src/components/Map/TripMap.tsx:60` — `map3d` is assigned but never used. Remove or use.
- `src/pages/TripDetail.tsx:83` — `react-hooks/exhaustive-deps` warning: `videoRef.current` may change by the time cleanup runs.
- `src/pages/TripDetail.tsx:213` — Same `react-hooks/exhaustive-deps` warning on `videoRef.current`.

These should be fixed so that `npm run lint` passes with zero errors and zero warnings.
