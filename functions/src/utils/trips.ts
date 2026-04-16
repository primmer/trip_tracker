/**
 * Extracts hashtags from a string.
 * Returns an array of hashtags without the '#' prefix.
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[1]);
}

/**
 * Checks if an activity should be excluded from syncing based on hashtags.
 * Returns true if the activity description contains the #no_triptracker_sync hashtag.
 */
export function shouldExcludeFromSync(text: string | null | undefined): boolean {
  if (!text) return false;
  const hashtags = extractHashtags(text);
  return hashtags.some((tag) => tag.toLowerCase() === 'no_triptracker_sync');
}

export interface Activity {
  id: number;
  name: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  elapsed_time: number;
  description: string | null;
  map: {
    summary_polyline: string;
  };
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
}

export interface ActivityStreams {
  latlng: [number, number][];
  altitude: number[];
  time: number[];
  distance: number[];
}

export interface Trip {
  id: string; // The hashtag or a generated ID
  hashtag: string | null;
  name: string;
  dateRange: {
    start: string;
    end: string;
  };
  activityIds: number[];
  summaryPolylines: string[];
}

/**
 * Groups activities into trips based on hashtags.
 * Activities without hashtags are treated as individual trips.
 */
export function groupActivitiesIntoTrips(activities: Activity[]): Trip[] {
  const tripMap = new Map<string, Trip>();
  const individualTrips: Trip[] = [];

  // Sort activities by date ascending to correctly determine date range
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  for (const activity of sortedActivities) {
    const allHashtags = extractHashtags(activity.description);
    // Filter out the exclusion hashtag - it should not create or join trips
    const hashtags = allHashtags.filter((tag) => tag.toLowerCase() !== 'no_triptracker_sync');
    const polyline = activity.map?.summary_polyline;

    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const existingTrip = tripMap.get(tag);
        if (existingTrip) {
          existingTrip.activityIds.push(activity.id);
          existingTrip.dateRange.end = activity.start_date;
          if (polyline) {
            existingTrip.summaryPolylines.push(polyline);
          }
        } else {
          tripMap.set(tag, {
            id: tag,
            hashtag: tag,
            name: tag, // Initially use the hashtag as the name
            dateRange: {
              start: activity.start_date,
              end: activity.start_date,
            },
            activityIds: [activity.id],
            summaryPolylines: polyline ? [polyline] : [],
          });
        }
      }
    } else {
      // Individual trip for activity without hashtag
      individualTrips.push({
        id: `activity_${activity.id}`,
        hashtag: null,
        name: activity.name,
        dateRange: {
          start: activity.start_date,
          end: activity.start_date,
        },
        activityIds: [activity.id],
        summaryPolylines: polyline ? [polyline] : [],
      });
    }
  }

  return [...tripMap.values(), ...individualTrips];
}
