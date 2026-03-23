/**
 * Extracts hashtags from a string.
 * Returns an array of hashtags without the '#' prefix.
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = [...text.matchAll(regex)];
  return matches.map(match => match[1]);
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

export interface Trip {
  id: string; // The hashtag or a generated ID
  hashtag: string | null;
  name: string;
  dateRange: {
    start: string;
    end: string;
  };
  activityIds: number[];
}

/**
 * Groups activities into trips based on hashtags.
 * Activities without hashtags are treated as individual trips.
 */
export function groupActivitiesIntoTrips(activities: Activity[]): Trip[] {
  const tripMap = new Map<string, Trip>();
  const individualTrips: Trip[] = [];

  // Sort activities by date ascending to correctly determine date range
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  for (const activity of sortedActivities) {
    const hashtags = extractHashtags(activity.description);

    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const existingTrip = tripMap.get(tag);
        if (existingTrip) {
          existingTrip.activityIds.push(activity.id);
          existingTrip.dateRange.end = activity.start_date;
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
      });
    }
  }

  return [...tripMap.values(), ...individualTrips];
}
