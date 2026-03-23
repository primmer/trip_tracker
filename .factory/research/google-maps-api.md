# Google Maps JavaScript API Research

## Core Packages
- `@vis.gl/react-google-maps` - Official React wrapper by Google Maps team
- `@googlemaps/js-api-loader` - Official loader
- `@googlemaps/markerclusterer` - For clustering many markers

## Map Setup
- Use `MapTypeId.HYBRID` for satellite view with labels
- `@vis.gl/react-google-maps` provides `<Map>`, `<AdvancedMarker>`, `<InfoWindow>` components

## Route Display
- `google.maps.Polyline` for drawing routes
- Feed GPS data from Strava streams (latlng arrays)

## Photo Markers
- AdvancedMarkerElement allows custom HTML (thumbnail images as markers)
- InfoWindow for popup with larger photo on click
- Use `useAdvancedMarkerRef` hook for anchor reference

## Camera Animation (2D Flyover)
- `map.moveCamera()` for smooth transitions
- `requestAnimationFrame` loop for smooth animation
- Geometry library for interpolation:
  - `google.maps.geometry.spherical.interpolate(p1, p2, fraction)` - between two points
  - `google.maps.geometry.spherical.computeLength(path)` - total path length
  - `google.maps.geometry.spherical.computeHeading(p1, p2)` - heading for camera direction
  - `google.maps.geometry.spherical.computeDistanceBetween(p1, p2)` - segment distances

## Elevation
- `google.maps.ElevationService.getElevationAlongPath({ path, samples })`
- Returns elevation in meters for each sample point
- Can also use Strava's altitude stream data directly

## Reverse Geocoding (for POI descriptions)
- `google.maps.Geocoder` for reverse geocoding coordinates to place names
- Returns address components including natural features

## Places API (New)
- `google.maps.places.Place.searchNearby()` (v3.55+)
- Can filter by types: `mountain_peak`, `park`, `natural_feature`
- Returns `displayName`, `location`, `types`
- Good for finding significant POIs along a route

## APIs to Enable in Google Cloud Console
1. Maps JavaScript API
2. Elevation API (if using server-side elevation)
3. Geocoding API
4. Places API (New)
