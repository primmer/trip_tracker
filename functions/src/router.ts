import { Router } from 'express';
import { refreshStravaTokenIfNeeded } from './services/strava.js';
import { groupActivitiesIntoTrips, type Activity } from './utils/trips.js';
import admin from 'firebase-admin';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// For local dev where we might hit /api/health directly
router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.post('/strava/sync', async (req, res) => {
  try {
    const accessToken = await refreshStravaTokenIfNeeded();
    
    // 1. Fetch ALL activities from Strava via pagination
    const allStravaActivities: Activity[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!activitiesResponse.ok) {
        throw new Error(`Failed to fetch activities from Strava (page ${page}): ${activitiesResponse.status}`);
      }

      const pageActivities = await activitiesResponse.json() as Activity[];
      if (pageActivities.length === 0) {
        hasMore = false;
      } else {
        allStravaActivities.push(...pageActivities);
        page++;
      }
    }
    
    let activitiesSaved = 0;
    let activitiesFailed = 0;
    let tripsSaved = 0;
    let tripsFailed = 0;

    const db = admin.firestore();
    
    // 2. Save activities to Firestore
    for (const activity of allStravaActivities) {
      try {
        const activityRef = db.collection('activities').doc(activity.id.toString());
        await activityRef.set({
          id: activity.id,
          name: activity.name,
          start_date: activity.start_date,
          distance: activity.distance,
          total_elevation_gain: activity.total_elevation_gain,
          elapsed_time: activity.elapsed_time,
          description: activity.description,
          map: {
            summary_polyline: activity.map.summary_polyline,
          },
          start_latlng: activity.start_latlng,
          end_latlng: activity.end_latlng,
          synced_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        activitiesSaved++;

        // Fetch GPS streams
        await fetchAndSaveStreams(activity.id, accessToken);
      } catch (error) {
        console.error(`Failed to save activity ${activity.id} to Firestore:`, error);
        activitiesFailed++;
      }
    }

    // 3. Group into trips and save
    const trips = groupActivitiesIntoTrips(allStravaActivities);
    for (const trip of trips) {
      try {
        const tripRef = db.collection('trips').doc(trip.id);
        await tripRef.set({
          ...trip,
          synced_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tripsSaved++;
      } catch (error) {
        console.error(`Failed to save trip ${trip.id} to Firestore:`, error);
        tripsFailed++;
      }
    }

    const hasCriticalFailures = (allStravaActivities.length > 0 && activitiesSaved === 0) || 
                               (trips.length > 0 && tripsSaved === 0);
    
    const responseStatus = hasCriticalFailures || activitiesFailed > 0 || tripsFailed > 0 ? 500 : 200;

    res.status(responseStatus).json({
      status: responseStatus === 200 ? 'success' : 'partial_success_or_error',
      activities_synced: allStravaActivities.length,
      trips_created: trips.length,
      activities_saved: activitiesSaved,
      activities_failed: activitiesFailed,
      trips_saved: tripsSaved,
      trips_failed: tripsFailed,
    });
  } catch (error) {
    console.error('Error syncing with Strava:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

async function fetchAndSaveStreams(activityId: number, accessToken: string) {
  const db = admin.firestore();
  
  // Check if streams already exist to be idempotent
  const streamDoc = await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').get();
  if (streamDoc.exists) {
    return;
  }

  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,altitude,time,distance&key_by_type=true`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch streams for activity ${activityId}: ${response.status}`);
    return;
  }

  const streams = await response.json();
  
  await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').set({
    latlng: streams.latlng?.data || [],
    altitude: streams.altitude?.data || [],
    time: streams.time?.data || [],
    distance: streams.distance?.data || [],
    fetched_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export { router };
