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
