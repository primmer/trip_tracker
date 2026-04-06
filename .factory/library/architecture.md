# Architecture

## Trip Detail Map System

The trip detail page (`/trip/:tripId`) is the primary map surface. It renders a full-bleed satellite map with route overlays, photo markers, and interactive controls.

### Component Hierarchy

```
TripDetail.tsx (page)
├── Header (back arrow, trip name, date, Map/Gallery toggle)
├── TripMap.tsx (map container)
│   ├── Map3D (from @vis.gl/react-google-maps)
│   │   ├── gmp-polyline-3d custom elements × N (one per activity, imperative)
│   │   ├── Marker3D (scrub position dot)
│   │   ├── Marker3D (animation position dot)
│   │   └── PhotoMarkers.tsx → Marker3D × N (photo thumbnails)
│   ├── MapAutoZoom (renderless, calculates range from bounds)
│   └── RouteAnimation.tsx (renderless, drives animation position)
├── Bottom Overlay (gradient, pointer-events-none container)
│   ├── ElevationChart.tsx (interactive SVG, pointer-events-auto)
│   ├── Stats (distance, elevation, duration)
│   ├── Ride Selector Pills ("All", "Ride 1", "Ride 2", ...)
│   └── Animation Controls (play/pause, speed toggle)
└── Photo Preview Overlay (z-[200], full-viewport dimmed)
```

### Data Flow

1. **Trip data** flows from Firestore via TripDetail → activities, photos, streams
2. **Active ride** (highlightedActivityId) drives: polyline highlighting, auto-zoom bounds, photo filtering, elevation chart data, stats display
3. **Scrub position**: ElevationChart emits {distance, altitude, grade, fraction} → TripDetail interpolates GPS position → TripMap renders Marker3D
4. **Animation position**: RouteAnimation computes position via requestAnimationFrame → TripMap renders Marker3D + camera follows
5. **Photo click**: PhotoMarkers → onPhotoSelect → TripDetail sets mapPreviewPhoto → preview overlay renders

### Map3D Camera Model

Map3D uses range-based camera (not zoom):
- `center: {lat, lng, altitude}` — camera target point
- `range` — distance from camera to center in meters
- `tilt` — angle from vertical (0=top-down, 90=horizon)
- `heading` — compass direction camera faces

Auto-zoom calculates range from bounding box diagonal:
```
range = computeDistanceBetween(ne, sw) * multiplier
```

### Key Invariants

- `@vis.gl/react-google-maps` v1.8.2 does not export a `Polyline3D` React component; route lines are rendered via imperative `gmp-polyline-3d` custom elements
- Polylines use `altitudeMode="CLAMP_TO_GROUND"` — follow terrain surface
- Markers use `altitudeMode="CLAMP_TO_GROUND"` — sit on terrain
- Bottom overlay uses `pointer-events-none` container with `pointer-events-auto` on interactive children
- Map3D uses `mode="hybrid"` for satellite imagery
- Photo filtering is by activity time window, not by proximity to route
