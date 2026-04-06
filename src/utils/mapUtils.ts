/**
 * Calculates camera parameters to frame all points within a LatLngBounds on a Map3D.
 *
 * The camera range is increased to ensure the route fits entirely within the visible
 * map area above the bottom overlay (elevation chart + stats). The overlay consumes
 * approximately the bottom 30% of the viewport, so we scale the range by 1/0.7 ≈ 1.43
 * to compensate. This keeps the geometric center of the route in the true center while
 * ensuring no part of the route is hidden under the overlay.
 */
export function calculateCameraFromBounds(bounds: google.maps.LatLngBounds): {
  center: { lat: number; lng: number };
  range: number;
} {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  let diagonal: number;

  if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
    diagonal = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(ne.lat(), ne.lng()),
      new google.maps.LatLng(sw.lat(), sw.lng()),
    );
  } else {
    const latDiff = Math.abs(ne.lat() - sw.lat());
    const lngDiff = Math.abs(ne.lng() - sw.lng());
    const metersPerDegree = 111320;
    diagonal = Math.sqrt(
      Math.pow(latDiff * metersPerDegree, 2) + Math.pow(lngDiff * metersPerDegree, 2),
    );
  }

  const geoCenter = bounds.getCenter();
  const latSpan = ne.lat() - sw.lat();

  // The bottom overlay consumes ~30% of viewport height.
  // Scale range by 1/(1-0.3) = 1.43 to fit route in visible area.
  // Original multiplier was 1.8, so new multiplier is 1.8 * 1.43 ≈ 2.57
  const visibleHeightRatio = 0.7;
  const rangeMultiplier = 1.8 / visibleHeightRatio;

  // Shift center SOUTH by ~12% to move the route UP in the viewport
  // (visible area has more space above than below due to overlay)
  const adjustedLat = geoCenter.lat() - latSpan * 0.12;

  return {
    center: { lat: adjustedLat, lng: geoCenter.lng() },
    range: Math.max(diagonal * rangeMultiplier, 1000),
  };
}

/** @deprecated Use calculateCameraFromBounds instead */
export function calculateRangeFromBounds(bounds: google.maps.LatLngBounds): number {
  return calculateCameraFromBounds(bounds).range;
}
