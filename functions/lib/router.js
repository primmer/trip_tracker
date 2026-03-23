import { Router } from 'express';
import { refreshStravaTokenIfNeeded } from './services/strava.js';
import { groupActivitiesIntoTrips } from './utils/trips.js';
import admin from 'firebase-admin';
import { createPickerSession, getPickerSession, listPickedMediaItems } from './services/google.js';
import { findNearestLatLng } from './utils/geo.js';
const router = Router();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function fetchDetailedActivity(activityId, accessToken) {
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
    return await response.json();
}
function cleanForFirestore(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => {
            if (Array.isArray(v)) {
                return JSON.stringify(v);
            }
            return cleanForFirestore(v);
        });
    }
    else if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    result[key] = value.map(v => Array.isArray(v) ? JSON.stringify(v) : cleanForFirestore(v));
                }
                else {
                    result[key] = cleanForFirestore(value);
                }
            }
        }
        return result;
    }
    return obj;
}
function prepareActivityForFirestore(activity) {
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
router.post('/strava/sync', async (req, res) => {
    try {
        const accessToken = await refreshStravaTokenIfNeeded();
        // 1. Fetch ALL activities from Strava via pagination
        const allStravaActivities = [];
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
            const pageActivities = await activitiesResponse.json();
            if (pageActivities.length === 0) {
                hasMore = false;
            }
            else {
                allStravaActivities.push(...pageActivities);
                page++;
            }
        }
        // 2. Fetch DETAILED activities to get descriptions and hashtags
        const detailedActivities = [];
        let activitiesSaved = 0;
        let activitiesFailed = 0;
        let rateLimitReached = false;
        const db = admin.firestore();
        for (let i = 0; i < allStravaActivities.length; i++) {
            if (rateLimitReached)
                break;
            const summary = allStravaActivities[i];
            try {
                // Check if we already have this activity with a description in Firestore
                const doc = await db.collection('activities').doc(summary.id.toString()).get();
                let detailed;
                if (doc.exists && doc.data()?.description !== undefined && doc.data()?.description !== null) {
                    console.log(`Activity ${summary.id} already has description in Firestore. Skipping detail fetch.`);
                    detailed = doc.data();
                }
                else {
                    console.log(`Fetching detailed activity ${summary.id} (${i + 1}/${allStravaActivities.length})...`);
                    detailed = await fetchDetailedActivity(summary.id, accessToken);
                    // Save detailed activity to Firestore
                    const activityRef = db.collection('activities').doc(summary.id.toString());
                    const cleanedData = prepareActivityForFirestore(detailed);
                    await activityRef.set({
                        ...cleanedData,
                        synced_at: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    activitiesSaved++;
                    // Small delay to respect rate limits
                    if (allStravaActivities.length > 10) {
                        await sleep(200);
                    }
                }
                // Use detailed description for hashtag grouping
                const activity = {
                    ...summary,
                    description: detailed?.description || null,
                };
                detailedActivities.push(activity);
                // Fetch GPS streams
                await fetchAndSaveStreams(activity.id, accessToken);
            }
            catch (error) {
                console.error(`Failed to sync activity ${summary.id}:`, error);
                if (error instanceof Error && error.message.includes('rate limit')) {
                    rateLimitReached = true;
                }
                else {
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
            }
            catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
        const activitiesData = [];
        for (const activityId of activityIds) {
            const activityDoc = await db.collection('activities').doc(activityId.toString()).get();
            if (activityDoc.exists) {
                const streamDoc = await db.collection('activities').doc(activityId.toString()).collection('streams').doc('data').get();
                const activityRaw = activityDoc.data();
                if (activityRaw) {
                    activitiesData.push({
                        ...activityRaw,
                        streams: streamDoc.exists ? streamDoc.data() : null
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
                if (!response.ok)
                    throw new Error(`Failed to download photo ${item.id}`);
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
                    mimeType: item.mimeType,
                    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await db.collection('trips').doc(tripId).collection('photos').doc(item.id).set(photoMetadata);
                results.push({ id: item.id, success: true });
            }
            catch (err) {
                console.error(`Error processing photo ${item.id}:`, err);
                results.push({ id: item.id, success: false, error: err instanceof Error ? err.message : 'Unknown' });
            }
        }
        res.status(200).json({ processed: results.length, details: results });
    }
    catch (error) {
        console.error('Error processing picker session:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
async function fetchAndSaveStreams(activityId, accessToken) {
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
//# sourceMappingURL=router.js.map