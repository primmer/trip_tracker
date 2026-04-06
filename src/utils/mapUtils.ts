/**
 * Calculates an appropriate camera range (distance from camera to center, in meters)
 * to frame all points within a LatLngBounds on a Map3D.
 *
 * Uses the diagonal distance of the bounding box as the basis, applying a multiplier
 * to ensure all content is visible with some margin.
 *
 * Falls back to equirectangular approximation if the Google Maps geometry library
 * is not available (e.g., in tests).
 */
export function calculateRangeFromBounds(bounds: google.maps.LatLngBounds): number {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  let diagonal: number;

  if (
    typeof google !== 'undefined' &&
    google.maps?.geometry?.spherical
  ) {
    diagonal = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(ne.lat(), ne.lng()),
      new google.maps.LatLng(sw.lat(), sw.lng()),
    );
  } else {
    // Equirectangular approximation fallback (for tests / pre-API-load)
    const latDiff = Math.abs(ne.lat() - sw.lat());
    const lngDiff = Math.abs(ne.lng() - sw.lng());
    const metersPerDegree = 111320;
    diagonal = Math.sqrt(
      Math.pow(latDiff * metersPerDegree, 2) + Math.pow(lngDiff * metersPerDegree, 2),
    );
  }

  // Multiply by 1.3 to ensure all route bounds fit with comfortable padding,
  // accounting for the bottom overlay consuming viewport space.
  // Minimum of 1000m to avoid zooming in too far on a single point
  return Math.max(diagonal * 1.3, 1000);
}
