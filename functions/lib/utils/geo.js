/**
 * Finds the nearest GPS coordinate for a given timestamp.
 * @param createdAt The timestamp of the photo (ISO 8601).
 * @param activityStartDate The start date of the activity (ISO 8601).
 * @param streams The GPS streams for the activity.
 * @returns The nearest LatLng or null if the timestamp is outside the activity window.
 */
export function findNearestLatLng(createdAt, activityStartDate, streams) {
    const photoTime = new Date(createdAt).getTime();
    const startTime = new Date(activityStartDate).getTime();
    // Convert streams.time (seconds from start) to absolute epoch ms
    const absoluteTimes = streams.time.map((t) => startTime + t * 1000);
    if (absoluteTimes.length === 0)
        return null;
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
        }
        else if (absoluteTimes[mid] < photoTime) {
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    // After binary search, low/high are the bounding indices
    const index = high < 0 ? 0 : high >= absoluteTimes.length ? absoluteTimes.length - 1 :
        (photoTime - absoluteTimes[high] < absoluteTimes[low] - photoTime ? high : low);
    const [lat, lng] = streams.latlng[index];
    return { lat, lng };
}
//# sourceMappingURL=geo.js.map