# AGENTS.md

## Project

Bike Trip Tracker -- a web app for tracking bike trips and bikepacking adventures. Integrates Strava (routes/activities), Google Photos (geotagged imagery), and Google Maps (interactive satellite/3D map display). The emphasis is on visual storytelling and photo presentation, not data logging.

## Requirements Source

All product requirements live in `spec.md` at the repo root. Read it before making feature decisions.

## Key Concepts

- **Trip grouping**: Strava activities are grouped into multi-day trips via hashtags in the private activity description (e.g. `#hmb_jul4`). Individual rides can also be explored standalone.
- **Photo filtering**: Photos displayed on the map are filtered by matching Strava activity media attachments against Google Photos (by filename similarity). Strava media are low-res references; full-res images come from Google Photos.
- **Auth model**: No user login. The app connects to one personal Strava/Google account with durable API tokens. Secrets are needed for Strava API, Google Photos API, and Google Maps API.
- **Route data**: Parsed from GPX or similar format from Strava activities; stored for map visualization.
- **Activity descriptions**: Auto-enhanced by scanning the route for geographic points of interest (mountains, ridges, notable areas) to replace Strava's generic titles.

## External APIs

| Service | Purpose |
|---------|---------|
| Strava API | Activity data, routes, media references, activity descriptions |
| Google Photos API | Full-resolution geotagged photos |
| Google Maps JavaScript API | Satellite map display, 3D flyover, geometry library |

## Version Control

Using local Jujutsu (jj) repository; will eventually move to a private GitHub repo.
