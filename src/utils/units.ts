/**
 * Converts meters to feet.
 * 1 meter = 3.28084 feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Converts meters to miles.
 * 1 mile = 1609.34 meters
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Converts meters to kilometers.
 */
export function metersToKm(meters: number): number {
  return meters / 1000;
}

/**
 * Formats duration in seconds to "Xh Ym" string.
 */
export function secondsToDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
