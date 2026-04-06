export interface Point {
  x: number;
  y: number;
}

/**
 * Processes elevation and distance data for display.
 * @param distance Array of distances in meters
 * @param altitude Array of altitudes in meters
 * @param maxPoints Maximum number of points to return (for downsampling)
 * @returns Array of Points {x: distance, y: altitude}
 */
export function processElevationData(
  distance: number[],
  altitude: number[],
  maxPoints: number = 200,
): Point[] {
  if (!distance || !altitude || distance.length === 0 || altitude.length === 0) {
    return [];
  }

  const dataLength = Math.min(distance.length, altitude.length);

  if (dataLength <= maxPoints) {
    return Array.from({ length: dataLength }, (_, i) => ({
      x: distance[i],
      y: altitude[i],
    }));
  }

  // Downsample
  const step = (dataLength - 1) / (maxPoints - 1);
  const result: Point[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round(i * step);
    result.push({
      x: distance[index],
      y: altitude[index],
    });
  }

  return result;
}
