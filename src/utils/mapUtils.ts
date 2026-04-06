/**
 * Calculates camera parameters to frame all points within a LatLngBounds on a Map3D.
 *
 * Returns both the range (distance from camera to center) and an adjusted center
 * that shifts northward to compensate for the bottom overlay consuming ~30% of
 * the viewport.
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
  // Shift center north by ~20% of the lat span to compensate for the bottom overlay
  const adjustedLat = geoCenter.lat() + latSpan * 0.2;

  return {
    center: { lat: adjustedLat, lng: geoCenter.lng() },
    range: Math.max(diagonal * 1.8, 1000),
  };
}

/** @deprecated Use calculateCameraFromBounds instead */
export function calculateRangeFromBounds(bounds: google.maps.LatLngBounds): number {
  return calculateCameraFromBounds(bounds).range;
}
