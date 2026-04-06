# AGENTS.md

## Project

Bike Trip Tracker -- a web app for tracking bike trips and bikepacking adventures. Integrates Strava (routes/activities), Google Photos (geotagged imagery), and Google Maps (interactive satellite/3D map display). The emphasis is on visual storytelling and photo presentation, not data logging.

## Requirements Source

Current overview of the project is in `README.md`. Original product requirements live in `spec.md` at the repo root. Read them before making feature decisions. 

## Version Control

Using local Jujutsu (`jj`) repository; will eventually move to a private GitHub repo. Commit incrementally after each meaningful feature or fix -- do not let a full session go by without checkpoints. Use `jj describe -m "..."` to set the working copy message.

## Key Concepts

- **Trip grouping**: Strava activities are grouped into multi-day trips via hashtags in the private activity description (e.g. `#hmb_jul4`). Individual rides can also be explored standalone.
- **Photos**: Photos are added per-trip via the Google Photos picker (admin mode). They are stored in Firestore as subcollections under each trip. Geolocation is derived by matching each photo's timestamp against the GPS stream of the trip's Strava activities -- photos taken during a ride get placed at the corresponding lat/lng on the map; photos taken off-ride (at camp, etc.) appear in the gallery only with no map location.
- **Auth model**: No user login. The app connects to one personal Strava/Google account with durable API tokens. Secrets are needed for Strava API, Google Photos API, and Google Maps API.
- **Route data**: Parsed from GPX or similar format from Strava activities; stored for map visualization.
- **Activity descriptions**: Auto-enhanced by scanning the route for geographic points of interest (mountains, ridges, notable areas) to replace Strava's generic titles.

## External APIs

| Service                    | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| Strava API                 | Activity data, routes, media references, activity descriptions |
| Google Photos API          | Full-resolution geotagged photos                               |
| Google Maps JavaScript API | Satellite map display, 3D flyover, geometry library            |

## Admin Mode

Administrative features (adding photos, /admin page) are hidden from public visitors. Append `?admin=<VITE_ADMIN_KEY>` to any URL to enable for the session, `?admin=off` to clear it. Controlled via `src/utils/admin.ts` and `sessionStorage`.

## Design Decisions

### Homepage

- Full-bleed hero photo that randomly rotates among trips with photos. Route polyline and elevation profile line overlay the hero, with a dark top gradient for nav/elevation contrast.
- Trip grid shows only trips with photos. Each tile has a photo background, route polyline, and elevation line at the bottom.
- Heading is "by Dave Primmer". Copyright is "David Primmer". No subtitle or explore link.
- Nav shows only "Trips" (plus "Admin" when in admin mode).

### Trips Page

- All trips listed grouped by month, regardless of photos. Same tile design as homepage.

### Trip Detail Map

- Full-bleed satellite/hybrid map using Google Maps vector rendering with 3D tilt and heading controls enabled. Users can tilt into 3D and rotate the map freely.
- Bottom overlay contains a scrubbable elevation chart, ride stats (distance, elevation, duration), and route animation controls. The overlay uses a gradient background and is positioned to avoid conflicting with Google Maps' own zoom/tilt controls on the right side.
- For multi-day trips, pill-style ride selector buttons ("All", "Ride 1", "Ride 2", etc.) filter which activity is shown. Selecting a ride re-fits the map bounds to that activity.
- Scrubbing the elevation chart places a marker dot on the map at the corresponding GPS position, with a tooltip showing distance, elevation, and grade.
- Route animation plays a dot along the route path with play/pause and 1x/2x speed controls.

### Trip Detail Photos

- Map photo markers are circular thumbnails. Clicking one opens a dimmed full-viewport preview that covers all UI (rendered outside the Maps component). Clicking the preview photo goes to the gallery lightbox; clicking off dismisses.
- Gallery is a clean grid of square thumbnails grouped by date. No hover overlays or filename display.
- Lightbox supports prev/next arrows, keyboard navigation, and swipe gestures. Shows date/time and position counter only.

### Route & Elevation Overlays

- Route polylines are sized to ~70% of their container. Hero polyline is more prominent than tile polylines.
- Elevation data is fetched from Firestore activity streams and rendered as a thin SVG line -- at the top of the hero, at the bottom of trip tiles.

## Development

Run `./dev.sh` to start both the frontend (Vite on :5173) and backend (Functions dev server on :5001). It checks if each is already running, builds the backend if needed, and prints health status. Always use this script rather than starting servers individually.

## Deployment

Hosted on Firebase at https://primco-trip-tracker.web.app. Firebase project ID is `primco-trip-tracker`. Firebase CLI is installed globally (`firebase-tools`).

- **Full deploy**: `npx vite build && firebase deploy` -- builds frontend, deploys hosting, functions, Firestore rules, and storage rules.
- **Hosting only** (faster, frontend changes only): `npx vite build && firebase deploy --only hosting`
- **Functions only**: `firebase deploy --only functions`

The `firebase.json` config rewrites `/api/**` to a Cloud Function and all other routes to `index.html` for SPA routing.

## Visual Testing

Always verify UI changes in the user's Chrome browser via the Chrome DevTools MCP tools (`chrome-devtools___*`). Take snapshots and screenshots after each visual change to confirm it looks correct before moving on. Do not rely on code review alone for frontend work -- render it and check it.

# TODO

## Planned: Video Support

- The Google Photos picker can return videos (mime type `video/mp4`). Currently the backend downloads the video thumbnail bytes only (Size 427,675 bytes Type

  video/mp4) and displays the thumbnail. Need to either skip videos during import or properly handle them -- download and render with a `<video>` element in the gallery/lightbox instead of `<img>`. Also, do not use them as thumbnails for tile backgrounds or hero images -- their thumb has a play button burned in.

## Planned: AI-Powered POI & Photo Captions

- Use AI to identify notable points of interest along each activity's GPS route (major landmarks, peaks, ridges, parks) and enrich the activity description with them.
- Optionally generate captions for trip photos using vision AI. Captions should be specific and informative (e.g. "Hawk Camp overlooking Gerbode Valley"), not obvious or generic (e.g. "picture of a bridge"). If the AI can't add meaningful context, skip the caption.
- Goal is to make trip storytelling richer without manual effort. Details on implementation TBD.

## UX nits:

#### the 3d map is not actually 3d. it tilt's but has no height in the mountains.

Now for Fix 4 (3D terrain) -- this is a different beast. Here's what the research found:

The standard Google Maps `Map` component with vector rendering does NOT support 3D terrain elevation for mountains, even when tilted. It only supports 3D buildings in urban
areas. The flat terrain you're seeing when tilted is expected behavior for the current API.

To get actual mountain height relief, you'd need to switch to `Map3D` (Photorealistic 3D Maps) from @vis.gl/react-google-maps v1.8.0+. This is a significant refactor
because:

1. Upgrade library from v1.1.0 to v1.8.0+
2. Replace <Map> with <Map3D> (different camera model: range instead of zoom)
3. Replace all google.maps.Polyline with <Polyline3D>
4. Replace <AdvancedMarker> with <Marker3D>
5. Replace <Marker> (scrub/animation markers) with 3D equivalents
6. Add 'maps3d' library to APIProvider
7. Rewrite RouteAnimation, PhotoMarkers, and auto-zoom logic for the 3D API

This isn't a quick fix -- it's a feature rewrite of the entire map component.