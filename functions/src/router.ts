import express, { Router } from 'express';
import { refreshStravaTokenIfNeeded } from './services/strava.js';
import { groupActivitiesIntoTrips, type Activity, type ActivityStreams } from './utils/trips.js';
import admin from 'firebase-admin';
import { createPickerSession, getPickerSession, listPickedMediaItems } from './services/google.js';
import { findNearestLatLng, sampleRoutePoints } from './utils/geo.js';
import { reverseGeocode, searchNearby } from './services/maps.js';
import { isGenericTitle } from './services/enhancer.js';

const router = Router();

// Add JSON body parsing middleware for all routes in this router
router.use(express.json());

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchDetailedActivity(activityId: number, accessToken: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Strava rate limit exceeded');
    }
    throw new Error(`Failed to fetch detailed activity ${activityId}: ${response.status}`);
  }

  return await response.json() as Record<string, unknown>;
}

function cleanForFirestore(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(v => {
      if (Array.isArray(v)) {
        return JSON.stringify(v);
      }
      return cleanForFirestore(v);
    });
  } else if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          result[key] = value.map(v => Array.isArray(v) ? JSON.stringify(v) : cleanForFirestore(v));
        } else {
          result[key] = cleanForFirestore(value);
        }
      }
    }
    return result;
  }
  return obj;
}

function prepareActivityForFirestore(activity: Record<string, unknown>) {
  // Remove large nested objects that we don't need and might cause issues with Firestore or size limits
  const copy = { ...activity };
  delete copy.segment_efforts;
  delete copy.laps;
  delete copy.best_efforts;
  delete copy.photos;
  delete copy.splits_metric;
  delete copy.splits_standard;

  return cleanForFirestore(copy);
}

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// For local dev where we might hit /api/health directly
router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.post('/api/activities/enhance-descriptions', async (req, res) => {
  const { activityId: reqActivityId } = req.body;
  const db = admin.firestore();

  try {
    let activityIds: string[] = [];
    if (reqActivityId) {
      activityIds = [reqActivityId.toString()];
    } else {
      // Fetch all activities with generic titles
      const snapshot = await db.collection('activities').get();
      activityIds = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          const title = data.name || '';
          const genericPattern = /^(Morning|Afternoon|Evening|Lunch|Night) Ride$/;
          return genericPattern.test(title) && !data.enhanced_description;
        })
        .map(doc => doc.id);
    }

    if (activityIds.length === 0) {
      return res.status(200).json({ message: 'No activities to enhance', enhanced: 0 });
    }

    const results = [];
    for (const id of activityIds) {
      try {
        const activityDoc = await db.collection('activities').doc(id).get();
        if (!activityDoc.exists) continue;

        const activityData = activityDoc.data();
        if (!activityData) continue;

        const title = activityData.name || '';
        const isGeneric = isGenericTitle(title);

        // Skip if already enhanced or has terminal marker
        if (activityData.enhanced_description || activityData.enhancement_attempted) {
          results.push({ id, status: 'skipped', reason: 'already enhanced or attempted' });
          continue;
        }

        // Even with explicit activityId, skip non-generic titles
        if (!isGeneric) {
          results.push({ id, status: 'skipped', reason: 'not a generic title' });
          continue;
        }

        // Load streams
        const streamDoc = await db.collection('activities').doc(id).collection('streams').doc('data').get();
        if (!streamDoc.exists) {
          results.push({ id, status: 'skipped', reason: 'no streams found' });
          continue;
        }

        const streamData = streamDoc.data();
        if (!streamData || !streamData.latlng_json) {
          results.push({ id, status: 'skipped', reason: 'invalid streams' });
          continue;
        }

        const streams: ActivityStreams = {
          latlng: JSON.parse(streamData.latlng_json),
          altitude: JSON.parse(streamData.altitude_json),
          time: JSON.parse(streamData.time_json),
          distance: JSON.parse(streamData.distance_json),
        };

        const samplePoints = sampleRoutePoints(streams);
        const allPois: string[] = [];

        // Geocoding and Places calls (MAX 3 each as per samplePoints)
        for (const point of samplePoints) {
          // Reverse geocode
          const geocode = await reverseGeocode(point.lat, point.lng);
          if (geocode) {
            const area = geocode.address_components.find(c => 
              c.types.includes('neighborhood') || 
              c.types.includes('sublocality') ||
              c.types.includes('locality') ||
              c.types.includes('natural_feature') ||
              c.types.includes('park')
            );
            if (area) allPois.push(area.long_name);
          }

          // Nearby search
          const places = await searchNearby(point.lat, point.lng);
          for (const place of places) {
            if (place.displayName?.text) {
              allPois.push(place.displayName.text);
            }
          }
        }

        const uniquePois = Array.from(new Set(allPois)).slice(0, 5);
        if (uniquePois.length === 0) {
          // Terminal marker: persist enhancement_attempted if no POIs found
          await db.collection('activities').doc(id).update({
            enhancement_attempted: true,
            enhancement_attempted_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          results.push({ id, status: 'skipped', reason: 'no POIs found, marked as attempted' });
          continue;
        }

        let enhancedTitle = '';
        if (uniquePois.length >= 2) {
          enhancedTitle = `Ride through ${uniquePois[0]} and ${uniquePois[1]}`;
        } else {
          enhancedTitle = `Ride near ${uniquePois[0]}`;
        }

        // Update Firestore
        await db.collection('activities').doc(id).update({
          enhanced_description: {
            title: enhancedTitle,
            original_title: activityData.name,
            pois: uniquePois,
            enhanced_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          // Optionally update the name itself if it's generic
          name: enhancedTitle, 
        });

        results.push({ id, status: 'enhanced', title: enhancedTitle });
      } catch (err) {
        console.error(`Error enhancing activity ${id}:`, err);
        results.push({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    res.status(200).json({ 
      message: `Enhanced ${results.filter(r => r.status === 'enhanced').length} activities`,
      results 
    });
  } catch (error) {
    console.error('Error enhancing descriptions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

async function enhanceActivity(id: string, db: admin.firestore.Firestore): Promise<string | null> {
  try {
    const activityDoc = await db.collection('activities').doc(id).get();
    if (!activityDoc.exists) return null;

    const activityData = activityDoc.data();
    if (!activityData) return null;

    const title = activityData.name || '';
    const isGeneric = isGenericTitle(title);

    // Skip if already enhanced or has terminal marker
    if (activityData.enhanced_description || activityData.enhancement_attempted) {
      return null;
    }

    // Skip non-generic titles
    if (!isGeneric) {
      return null;
    }

    // Load streams
    const streamDoc = await db.collection('activities').doc(id).collection('streams').doc('data').get();
    if (!streamDoc.exists) {
      return null;
    }

    const streamData = streamDoc.data();
    if (!streamData || !streamData.latlng_json) {
      return null;
    }

    const streams: ActivityStreams = {
      latlng: JSON.parse(streamData.latlng_json),
      altitude: JSON.parse(streamData.altitude_json),
      time: JSON.parse(streamData.time_json),
      distance: JSON.parse(streamData.distance_json),
    };

    const samplePoints = sampleRoutePoints(streams);
    const allPois: string[] = [];

    // Geocoding and Places calls (MAX 3 each as per samplePoints)
    for (const point of samplePoints) {
      // Reverse geocode
      const geocode = await reverseGeocode(point.lat, point.lng);
      if (geocode) {
        const area = geocode.address_components.find(c => 
          c.types.includes('neighborhood') || 
          c.types.includes('sublocality') ||
          c.types.includes('locality') ||
          c.types.includes('natural_feature') ||
          c.types.includes('park')
        );
        if (area) allPois.push(area.long_name);
      }

      // Nearby search
      const places = await searchNearby(point.lat, point.lng);
      for (const place of places) {
        if (place.displayName?.text) {
          allPois.push(place.displayName.text);
        }
      }
    }

    const uniquePois = Array.from(new Set(allPois)).slice(0, 5);
    if (uniquePois.length === 0) {
      // Terminal marker: persist enhancement_attempted if no POIs found
      await db.collection('activities').doc(id).update({
        enhancement_attempted: true,
        enhancement_attempted_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    let enhancedTitle = '';
    if (uniquePois.length >= 2) {
      enhancedTitle = `Ride through ${uniquePois[0]} and ${uniquePois[1]}`;
    } else {
      enhancedTitle = `Ride near ${uniquePois[0]}`;
    }

    // Update Firestore
    await db.collection('activities').doc(id).update({
      enhanced_description: {
        title: enhancedTitle,
        original_title: activityData.name,
        pois: uniquePois,
        enhanced_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      name: enhancedTitle, 
    });

    return enhancedTitle;
  } catch (err) {
    console.error(`Error enhancing activity ${id}:`, err);
    return null;
  }
}

router.post('/api/strava/sync', async (req, res) => {
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
    
    // 2. Fetch DETAILED activities to get descriptions and hashtags
    const detailedActivities: Activity[] = [];
    let activitiesSaved = 0;
    let activitiesFailed = 0;
    let rateLimitReached = false;
    
    const db = admin.firestore();

    for (let i = 0; i < allStravaActivities.length; i++) {
      if (rateLimitReached) break;

      const summary = allStravaActivities[i];
      try {
        // Check if we already have this activity with a description in Firestore
        const doc = await db.collection('activities').doc(summary.id.toString()).get();
        let detailed: Activity | Record<string, unknown> | undefined;
        
        if (doc.exists && doc.data()?.description !== undefined && doc.data()?.description !== null) {
          console.log(`Activity ${summary.id} already has description in Firestore. Skipping detail fetch.`);
          detailed = doc.data() as Activity;
        } else {
          console.log(`Fetching detailed activity ${summary.id} (${i + 1}/${allStravaActivities.length})...`);
          detailed = await fetchDetailedActivity(summary.id, accessToken);
          
          // Save detailed activity to Firestore
          const activityRef = db.collection('activities').doc(summary.id.toString());
          const cleanedData = prepareActivityForFirestore(detailed);
          
          await activityRef.set({
            ...(cleanedData as Record<string, unknown>),
            synced_at: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          activitiesSaved++;

          // Small delay to respect rate limits
          if (allStravaActivities.length > 10) {
            await sleep(200);
          }
        }
        
        // Use detailed description for hashtag grouping
        const activity: Activity = {
          ...summary,
          description: (detailed as Activity).description || null,
        };
        detailedActivities.push(activity);

        // Fetch GPS streams
        await fetchAndSaveStreams(activity.id, accessToken);

      } catch (error) {
        console.error(`Failed to sync activity ${summary.id}:`, error);
        if (error instanceof Error && error.message.includes('rate limit')) {
          rateLimitReached = true;
        } else {
          activitiesFailed++;
        }
      }
    }

    // 3. Group into trips and save
    const trips = groupActivitiesIntoTrips(detailedActivities);
    let tripsSaved = 0;
    let tripsFailed = 0;
    for (const trip of trips) {
      try {
        const tripRef = db.collection('trips').doc(trip.id);
        const tripDataToSave = { ...trip };
        await tripRef.set({
          ...tripDataToSave,
          synced_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tripsSaved++;
      } catch (error) {
        console.error(`Failed to save trip ${trip.id} to Firestore:`, error);
        tripsFailed++;
      }
    }

    // 4. Automatically enhance generic titles for NEWLY synced activities
    let enhancedCount = 0;
    for (const activity of detailedActivities) {
      if (isGenericTitle(activity.name)) {
        const enhancedTitle = await enhanceActivity(activity.id.toString(), db);
        if (enhancedTitle) enhancedCount++;
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
      enhanced_count: enhancedCount,
    });
  } catch (error) {
    console.error('Error syncing with Strava:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/api/photos/picker-session', async (req, res) => {
  try {
    const session = await createPickerSession();
    res.status(200).json(session);
  } catch (error) {
    console.error('Error creating picker session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/api/photos/picker-session/:sessionId', async (req, res) => {
  try {
    const session = await getPickerSession(req.params.sessionId);
    res.status(200).json(session);
  } catch (error) {
    console.error('Error getting picker session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/api/photos/process-session', async (req, res) => {
  const { sessionId, tripId } = req.body;
  if (!sessionId || !tripId) {
    return res.status(400).json({ error: 'sessionId and tripId are required' });
  }

  try {
    const db = admin.firestore();
    const tripDoc = await db.collection('trips').doc(tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const tripData = tripDoc.data();
    const activityIds = tripData?.activityIds || [];

    // Fetch activities and their streams for this trip
    const activitiesData: (Activity & { streams: ActivityStreams | null })[] = [];
    for (const activityId of activityIds) {
      const activityDoc = await db.collection('activities').doc(activityId.toString()).get();
      if (activityDoc.exists) {
        const streamDoc = await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').get();
        const activityRaw = activityDoc.data() as Activity;
        if (activityRaw) {
          let streams: ActivityStreams | null = null;
          if (streamDoc.exists) {
            const data = streamDoc.data();
            if (data && data.latlng_json) {
              streams = {
                latlng: JSON.parse(data.latlng_json),
                altitude: JSON.parse(data.altitude_json),
                time: JSON.parse(data.time_json),
                distance: JSON.parse(data.distance_json),
              };
            } else if (data && data.latlng) {
              streams = {
                latlng: data.latlng,
                altitude: data.altitude,
                time: data.time,
                distance: data.distance,
              };
            }
          }

          activitiesData.push({
            ...activityRaw,
            streams
          });
        }
      }
    }

    const mediaItems = await listPickedMediaItems(sessionId);
    const results = [];

    for (const item of mediaItems) {
      try {
        // 1. Download photo (baseUrl + w2048)
        const photoUrl = `${item.baseUrl}=w2048`;
        const response = await fetch(photoUrl);
        if (!response.ok) throw new Error(`Failed to download photo ${item.id}`);
        const buffer = await response.arrayBuffer();

        // 2. Upload to Firebase Storage
        const bucket = admin.storage().bucket();
        const filename = `${item.id}.jpg`; // Assumption: mostly JPEGs or conversion handled by baseUrl
        const storagePath = `trips/${tripId}/photos/${filename}`;
        const file = bucket.file(storagePath);
        
        await file.save(Buffer.from(buffer), {
          metadata: {
            contentType: item.mimeType || 'image/jpeg',
          },
        });

        // Get public download URL
        const [downloadUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '03-01-2500', // Long-lived
        });

        // 3. Geolocation derivation
        let lat = null;
        let lng = null;
        if (item.creationTime) {
          for (const activity of activitiesData) {
            if (activity.streams) {
              const geo = findNearestLatLng(item.creationTime, activity.start_date, activity.streams);
              if (geo) {
                lat = geo.lat;
                lng = geo.lng;
                break; // Found matching activity
              }
            }
          }
        }

        // 4. Firestore metadata
        const photoMetadata = {
          id: item.id,
          filename,
          storagePath,
          downloadUrl,
          createdAt: item.creationTime,
          lat,
          lng,
          width: item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width) : null,
          height: item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height) : null,
          mimeType: item.mimeType,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('trips').doc(tripId).collection('photos').doc(item.id).set(photoMetadata);
        results.push({ id: item.id, success: true });
      } catch (err) {
        console.error(`Error processing photo ${item.id}:`, err);
        results.push({ id: item.id, success: false, error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    res.status(200).json({ processed: results.length, details: results });
  } catch (error) {
    console.error('Error processing picker session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

async function fetchAndSaveStreams(activityId: number, accessToken: string) {
  const db = admin.firestore();
  
  // Check if streams already exist to be idempotent
  const streamDoc = await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').get();
  if (streamDoc.exists) {
    const data = streamDoc.data();
    // If it already has the new format, we're done
    if (data && data.latlng_json) {
      return;
    }
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

  const streams = (await response.json()) as Record<string, { data: unknown[] }>;
  
  // Store as JSON strings to avoid Firestore limits
  await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').set({
    latlng_json: JSON.stringify(streams.latlng?.data || []),
    altitude_json: JSON.stringify(streams.altitude?.data || []),
    time_json: JSON.stringify(streams.time?.data || []),
    distance_json: JSON.stringify(streams.distance?.data || []),
    fetched_at: admin.firestore.FieldValue.serverTimestamp(),
    // Remove old array fields
    latlng: admin.firestore.FieldValue.delete(),
    altitude: admin.firestore.FieldValue.delete(),
    time: admin.firestore.FieldValue.delete(),
    distance: admin.firestore.FieldValue.delete(),
  }, { merge: true });
}

router.get('/api/activities/:activityId/streams', async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId);
    if (isNaN(activityId)) {
      return res.status(400).json({ error: 'Invalid activityId' });
    }

    const db = admin.firestore();
    const streamDoc = await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').get();
    
    let streamsData: ActivityStreams | null = null;

    if (streamDoc.exists) {
      const data = streamDoc.data();
      if (data && data.latlng_json) {
        streamsData = {
          latlng: JSON.parse(data.latlng_json),
          altitude: JSON.parse(data.altitude_json),
          time: JSON.parse(data.time_json),
          distance: JSON.parse(data.distance_json),
        };
      } else if (data && data.latlng) {
        // Fallback for legacy array format
        streamsData = {
          latlng: data.latlng,
          altitude: data.altitude,
          time: data.time,
          distance: data.distance,
        };
      }
    }

    if (!streamsData) {
      // Lazy fetch from Strava if missing
      console.log(`Lazy fetching streams for activity ${activityId} from Strava...`);
      const accessToken = await refreshStravaTokenIfNeeded();
      const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,altitude,time,distance&key_by_type=true`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch streams from Strava: ${response.statusText}` });
      }

      const streams = (await response.json()) as Record<string, { data: unknown[] }>;
      streamsData = {
        latlng: (streams.latlng?.data || []) as [number, number][],
        altitude: (streams.altitude?.data || []) as number[],
        time: (streams.time?.data || []) as number[],
        distance: (streams.distance?.data || []) as number[],
      };

      // Cache to Firestore in the new JSON string format
      await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').set({
        latlng_json: JSON.stringify(streamsData.latlng),
        altitude_json: JSON.stringify(streamsData.altitude),
        time_json: JSON.stringify(streamsData.time),
        distance_json: JSON.stringify(streamsData.distance),
        fetched_at: admin.firestore.FieldValue.serverTimestamp(),
        // Ensure old fields are removed if this was an update
        latlng: admin.firestore.FieldValue.delete(),
        altitude: admin.firestore.FieldValue.delete(),
        time: admin.firestore.FieldValue.delete(),
        distance: admin.firestore.FieldValue.delete(),
      }, { merge: true });
    }

    res.status(200).json(streamsData);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router };
