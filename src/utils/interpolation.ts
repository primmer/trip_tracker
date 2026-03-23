/**
 * Interpolates between two points at a given fraction (0 to 1).
 * Uses google.maps.geometry.spherical.interpolate if available,
 * otherwise falls back to simple linear interpolation for tests.
 */
export const interpolatePoint = (
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  fraction: number
): { lat: number; lng: number } => {
  if (typeof google !== 'undefined' && google.maps && google.maps.geometry && google.maps.geometry.spherical) {
    const from = new google.maps.LatLng(p1.lat, p1.lng);
    const to = new google.maps.LatLng(p2.lat, p2.lng);
    const result = google.maps.geometry.spherical.interpolate(from, to, fraction);
    return { lat: result.lat(), lng: result.lng() };
  }

  // Fallback linear interpolation for tests or if library not loaded
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lng: p1.lng + (p2.lng - p1.lng) * fraction,
  };
};

/**
 * Calculates the total length of a path in meters.
 */
export const computePathLength = (path: { lat: number; lng: number }[]): number => {
  if (typeof google !== 'undefined' && google.maps && google.maps.geometry && google.maps.geometry.spherical) {
    const latLngPath = path.map(p => new google.maps.LatLng(p.lat, p.lng));
    return google.maps.geometry.spherical.computeLength(latLngPath);
  }

  // Simple Euclidean fallback for tests (not accurate for Earth but fine for unit testing logic)
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    length += Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2));
  }
  return length;
};

/**
 * Finds the point at a specific distance along a path.
 */
export const getPointAtDistance = (
  path: { lat: number; lng: number }[],
  targetDistance: number
): { lat: number; lng: number } => {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1 || targetDistance <= 0) return path[0];

  let accumulatedDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    
    let segmentDistance: number;
    if (typeof google !== 'undefined' && google.maps && google.maps.geometry && google.maps.geometry.spherical) {
      segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(p1.lat, p1.lng),
        new google.maps.LatLng(p2.lat, p2.lng)
      );
    } else {
      segmentDistance = Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2));
    }

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const remainingDistance = targetDistance - accumulatedDistance;
      const fraction = segmentDistance === 0 ? 0 : remainingDistance / segmentDistance;
      return interpolatePoint(p1, p2, fraction);
    }
    
    accumulatedDistance += segmentDistance;
  }

  return path[path.length - 1];
};
