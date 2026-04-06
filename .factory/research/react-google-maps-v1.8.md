# @vis.gl/react-google-maps v1.8.x — Map3D API Reference

## Map3D Component

Props:
- `mode`: `"hybrid"` | `"satellite"` (REQUIRED for satellite imagery)
- `center`: `{lat, lng, altitude}` (controlled)
- `defaultCenter`: `{lat, lng, altitude}` (uncontrolled)
- `range`: number (meters from camera to center)
- `defaultRange`: number
- `tilt`: 0-90 (0=top-down, 90=horizon)
- `defaultTilt`: number
- `heading`: 0-360 (compass direction)
- `defaultHeading`: number
- Events: `onCameraChanged`, `onSteadyChange`, `onClick`

## useMap3D Hook

Returns `Map3DElement | null`. Methods:
- `flyCameraTo({endCamera: {center, range, tilt, heading}, durationMillis})` — animated transition
- `flyCameraAround({center, range, rounds, durationMillis})` — orbit animation
- `stopCameraAnimation()` — halt any fly animation

## Marker3D Component

Props:
- `position`: `{lat, lng, altitude?}`
- `altitudeMode`: `"ABSOLUTE"` | `"CLAMP_TO_GROUND"` | `"RELATIVE_TO_GROUND"` | `"RELATIVE_TO_MESH"`
- `extruded`: boolean (draws line to ground)
- `label`: string
- `drawsWhenOccluded`: boolean
- Children: arbitrary HTML/SVG (like AdvancedMarker)

## Polyline3D Component

Props:
- `coordinates`: `Array<{lat, lng, altitude}>`
- `altitudeMode`: same as Marker3D
- `strokeColor`: CSS color string
- `strokeWidth`: number (pixels)
- `extruded`: boolean (draws wall to ground)

## Migration Notes

- `useMap()` → `useMap3D()` (different context providers)
- `map.fitBounds()` → calculate range from bounds diagonal
- `map.panTo()` → set `map3d.center` directly (instant) or `flyCameraTo()` (animated)
- `google.maps.Polyline` (imperative) → `<Polyline3D>` (declarative)
- `<Marker>` → `<Marker3D>` with HTML children for custom appearance
- `<AdvancedMarker>` → `<Marker3D>` (similar API, adds altitude support)
- No `mapId`, `renderingType`, `gestureHandling`, `mapTypeControl` on Map3D
- Always set `mode="hybrid"` — without it, may render as gray globe
