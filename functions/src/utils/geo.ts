import { ActivityStreams } from './trips.js';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Samples up to 3 evenly-spaced points along the route for geocoding/POI lookups.
 */
export function sampleRoutePoints(streams: ActivityStreams): LatLng[] {
  const points = streams.latlng;
  if (!points || points.length === 0) return [];
  if (points.length === 1) return [{ lat: points[0][0], lng: points[0][1] }];

  const count = Math.min(3, points.length);
  const result: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (points.length - 1));
    result.push({ lat: points[idx][0], lng: points[idx][1] });
  }
  return result;
}

/**
 * Finds the nearest GPS coordinate for a given timestamp.
 * @param createdAt The timestamp of the photo (ISO 8601).
 * @param activityStartDate The start date of the activity (ISO 8601).
 * @param streams The GPS streams for the activity.
 * @returns The nearest LatLng or null if the timestamp is outside the activity window.
 */
export function findNearestLatLng(
  createdAt: string,
  activityStartDate: string,
  streams: ActivityStreams,
): LatLng | null {
  const photoTime = new Date(createdAt).getTime();
  const startTime = new Date(activityStartDate).getTime();

  // Convert streams.time (seconds from start) to absolute epoch ms
  const absoluteTimes = streams.time.map((t: number) => startTime + t * 1000);

  if (absoluteTimes.length === 0) return null;

  const minTime = absoluteTimes[0];
  const maxTime = absoluteTimes[absoluteTimes.length - 1];

  // Buffer of 10 minutes (600,000 ms) to account for slight clock drifts
  const BUFFER = 600000;

  if (photoTime < minTime - BUFFER || photoTime > maxTime + BUFFER) {
    return null;
  }

  // Binary search for nearest time
  let low = 0;
  let high = absoluteTimes.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (absoluteTimes[mid] === photoTime) {
      const [lat, lng] = streams.latlng[mid];
      return { lat, lng };
    } else if (absoluteTimes[mid] < photoTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // After binary search, low/high are the bounding indices
  const index =
    high < 0
      ? 0
      : high >= absoluteTimes.length
        ? absoluteTimes.length - 1
        : photoTime - absoluteTimes[high] < absoluteTimes[low] - photoTime
          ? high
          : low;

  const [lat, lng] = streams.latlng[index];
  return { lat, lng };
}
