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
    
    // 1. Fetch activities from Strava
    // Default to a reasonable number, or all athlete activities
    const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!activitiesResponse.ok) {
      throw new Error(`Failed to fetch activities from Strava: ${activitiesResponse.status}`);
    }

    const stravaActivities = await activitiesResponse.json() as Activity[];
    
    let activitiesSaved = 0;
    let tripsSaved = 0;

    try {
      const db = admin.firestore();
      
      // 2. Save activities to Firestore
      for (const activity of stravaActivities) {
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
          console.warn(`Failed to save activity ${activity.id} to Firestore:`, error);
        }
      }

      // 3. Group into trips and save
      const trips = groupActivitiesIntoTrips(stravaActivities);
      for (const trip of trips) {
        try {
          const tripRef = db.collection('trips').doc(trip.id);
          await tripRef.set({
            ...trip,
            synced_at: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          tripsSaved++;
        } catch (error) {
          console.warn(`Failed to save trip ${trip.id} to Firestore:`, error);
        }
      }
    } catch (error) {
      console.warn('Firestore is not available. Returning Strava data directly.');
    }

    res.status(200).json({
      status: 'success',
      activities_synced: stravaActivities.length,
      trips_created: groupActivitiesIntoTrips(stravaActivities).length,
      firestore_synced: activitiesSaved > 0,
      activities_saved: activitiesSaved,
      trips_saved: tripsSaved,
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
