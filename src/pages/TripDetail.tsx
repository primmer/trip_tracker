import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Activity, ActivityStreams } from '../types';
import { Photo } from '../components/Map/PhotoMarkers';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Play,
  Pause,
  FastForward,
  ImagePlus,
  Loader2,
  Map as MapIcon,
  Grid,
  Bike,
  Mountain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  metersToFeet,
  metersToMiles,
  secondsToDuration,
  formatTripName,
} from '../utils/units';
import { TripMap } from '../components/Map/TripMap';
import { ROUTE_COLORS } from '../components/Map/routeColors';
import { PhotoGallery } from '../components/PhotoGallery';
import { ErrorBanner } from '../components/ErrorBanner';
import { ElevationChart, ElevationScrubData } from '../components/ElevationChart';
import { getApiBaseUrl } from '../utils/api';
import { isAdmin } from '../utils/admin';

const LightboxOverlay: React.FC<{
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
}> = ({ photo, photos, onClose, onNavigate }) => {
  const sortedPhotos = useMemo(
    () =>
      [...photos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [photos],
  );
  const currentIndex = sortedPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sortedPhotos.length - 1;

  const goTo = useCallback(
    (dir: -1 | 1) => {
      const next = sortedPhotos[currentIndex + dir];
      if (next) onNavigate(next);
    },
    [sortedPhotos, currentIndex, onNavigate],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) goTo(-1);
      if (e.key === 'ArrowRight' && hasNext) goTo(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, hasPrev, hasNext, goTo]);

  // Swipe gesture
  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx > 0 && hasPrev) goTo(-1);
        if (dx < 0 && hasNext) goTo(1);
      }
      touchStartX.current = null;
    },
    [hasPrev, hasNext, goTo],
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition-colors z-[110] min-h-[44px] min-w-[44px] flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition-colors z-[110] min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            goTo(-1);
          }}
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition-colors z-[110] min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            goTo(1);
          }}
          aria-label="Next photo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.downloadUrl}
          alt=""
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        <div className="mt-4 text-center text-white/50 text-sm">
          {new Date(photo.createdAt).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {' \u00B7 '}
          {new Date(photo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {photos.length > 1 && (
            <span className="ml-3">
              {currentIndex + 1} / {sortedPhotos.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const TripDetail: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [streams, setStreams] = useState<Record<number, ActivityStreams>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
  const [animationState, setAnimationState] = useState<{
    isPlaying: boolean;
    speed: number;
    activityId: number | null;
  }>({
    isPlaying: false,
    speed: 1,
    activityId: null,
  });
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [pickProgress, setPickProgress] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'gallery'>('map');
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<Photo | null>(null);
  const [mapPreviewPhoto, setMapPreviewPhoto] = useState<Photo | null>(null);
  const [, setFetchingStreams] = useState<Record<number, boolean>>({});
  const [, setStreamErrors] = useState<Record<number, string | null>>({});
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);
  const [scrubPosition, setScrubPosition] = useState<{ lat: number; lng: number } | null>(null);

  const combinedStreams = useMemo(() => {
    const visibleActivities = activities.filter(
      (a) => activeActivityId === null || a.id === activeActivityId,
    );
    const withStreams = visibleActivities.filter((a) => streams[a.id]?.altitude?.length > 1);
    if (withStreams.length === 0) return null;

    let combinedDistance: number[] = [];
    let combinedAltitude: number[] = [];
    let combinedLatlng: [number, number][] = [];

    if (withStreams.length === 1) {
      const s = streams[withStreams[0].id];
      combinedDistance = s.distance;
      combinedAltitude = s.altitude;
      combinedLatlng = s.latlng;
    } else {
      let distanceOffset = 0;
      for (const a of withStreams) {
        const s = streams[a.id];
        combinedDistance.push(...s.distance.map((d) => d + distanceOffset));
        combinedAltitude.push(...s.altitude);
        combinedLatlng.push(...s.latlng);
        distanceOffset += s.distance[s.distance.length - 1] || 0;
      }
    }
    return { distance: combinedDistance, altitude: combinedAltitude, latlng: combinedLatlng };
  }, [activities, activeActivityId, streams]);

  const visiblePhotos = useMemo(() => {
    const geoPhotos = photos.filter((p) => p.lat !== null && p.lng !== null);
    if (activeActivityId === null) return geoPhotos;

    const activity = activities.find((a) => a.id === activeActivityId);
    if (!activity) return geoPhotos;

    const start = new Date(activity.start_date).getTime();
    const end = start + activity.elapsed_time * 1000;

    return geoPhotos.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [photos, activeActivityId, activities]);

  const handleElevationScrub = useCallback(
    (data: ElevationScrubData | null) => {
      if (!data || !combinedStreams) {
        setScrubPosition(null);
        return;
      }
      // Binary search for the distance value in combinedStreams.distance
      const dists = combinedStreams.distance;
      const latlngs = combinedStreams.latlng;
      let lo = 0,
        hi = dists.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (dists[mid] < data.distance) lo = mid + 1;
        else hi = mid;
      }
      const idx = lo;
      if (idx === 0 || dists[idx] === data.distance) {
        setScrubPosition({ lat: latlngs[idx][0], lng: latlngs[idx][1] });
      } else {
        // Interpolate between idx-1 and idx
        const prev = idx - 1;
        const t = (data.distance - dists[prev]) / (dists[idx] - dists[prev]);
        setScrubPosition({
          lat: latlngs[prev][0] + t * (latlngs[idx][0] - latlngs[prev][0]),
          lng: latlngs[prev][1] + t * (latlngs[idx][1] - latlngs[prev][1]),
        });
      }
    },
    [combinedStreams],
  );

  const handleAddPhotos = async () => {
    if (!tripId) return;
    setIsPickingPhotos(true);
    setPickProgress('Checking connection...');
    const apiBaseUrl = getApiBaseUrl();
    try {
      // 0. Pre-check backend health
      try {
        const healthResponse = await fetch(`${apiBaseUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!healthResponse.ok) throw new Error('Backend health check failed');
      } catch (err) {
        throw new Error(
          'Backend server not running. Start it with: cd functions && node lib/dev-server.js',
        );
      }

      // 1. Create Picker Session
      setPickProgress('Creating session...');
      const response = await fetch(`${apiBaseUrl}/api/photos/picker-session`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create picker session');
      const session = await response.json();

      // 2. Open Picker in new window
      const pickerWindow = window.open(
        session.pickerUri,
        'Google Photos Picker',
        'width=800,height=600',
      );
      if (!pickerWindow) {
        throw new Error('Please enable popups to use the photo picker');
      }

      setPickProgress('Waiting for selection...');

      // 3. Poll session for completion
      let closedPollCount = 0;
      const MAX_CLOSED_POLLS = 60; // Keep polling up to 5 minutes after window closes
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`${apiBaseUrl}/api/photos/picker-session/${session.id}`);
          if (!pollResponse.ok) throw new Error('Polling failed');
          const pollData = await pollResponse.json();

          if (pollData.mediaItemsSet) {
            clearInterval(pollInterval);
            setPickProgress('Processing photos...');

            // 4. Trigger processing in backend
            const processResponse = await fetch(`${apiBaseUrl}/api/photos/process-session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.id, tripId }),
            });

            if (!processResponse.ok) throw new Error('Processing failed');

            setPickProgress('Done!');

            // Refresh photos
            const photosQuery = query(collection(db, 'trips', tripId, 'photos'));
            const photosSnapshot = await getDocs(photosQuery);
            const photosData = photosSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Photo[];
            setPhotos(photosData);

            setTimeout(() => {
              setPickProgress(null);
              setIsPickingPhotos(false);
            }, 2000);
          } else if (pickerWindow.closed) {
            closedPollCount++;
            setPickProgress(`Waiting for Google to confirm selection...`);
            if (closedPollCount >= MAX_CLOSED_POLLS) {
              clearInterval(pollInterval);
              setPickProgress(null);
              setIsPickingPhotos(false);
              setAddPhotoError('Timed out waiting for Google Photos. Try again.');
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
          clearInterval(pollInterval);
          setIsPickingPhotos(false);
          setPickProgress(null);
        }
      }, 5000);
    } catch (err) {
      console.error('Error adding photos:', err);
      setAddPhotoError(err instanceof Error ? err.message : 'Failed to add photos');
      setIsPickingPhotos(false);
      setPickProgress(null);
    }
  };

  const handlePlayPause = (activityId: number) => {
    setAnimationState((prev) => ({
      ...prev,
      activityId,
      isPlaying: prev.activityId === activityId ? !prev.isPlaying : true,
    }));
  };

  const toggleSpeed = () => {
    setAnimationState((prev) => ({
      ...prev,
      speed: prev.speed === 1 ? 2 : 1,
    }));
  };

  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripId) return;
      setLoading(true);
      try {
        const tripDoc = await getDoc(doc(db, 'trips', tripId));
        if (!tripDoc.exists()) {
          setError('Trip not found');
          setLoading(false);
          return;
        }

        const tripData = { id: tripDoc.id, ...tripDoc.data() } as Trip;
        setTrip(tripData);

        // Fetch activities
        const activitiesQuery = query(
          collection(db, 'activities'),
          where(
            documentId(),
            'in',
            tripData.activityIds.map((id) => id.toString()),
          ),
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData = activitiesSnapshot.docs.map((doc) => ({
          id: parseInt(doc.id),
          ...doc.data(),
        })) as Activity[];

        // Sort activities by date
        activitiesData.sort(
          (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        );
        setActivities(activitiesData);
        if (activitiesData.length === 1) {
          setActiveActivityId(activitiesData[0].id);
        }

        // Fetch streams for each activity (try Firestore first, then API)
        const streamsData: Record<number, ActivityStreams> = {};
        const apiBaseUrl = getApiBaseUrl();

        const parseStreamData = (data: Record<string, unknown>): ActivityStreams | null => {
          if (data.latlng_json) {
            return {
              latlng: JSON.parse(data.latlng_json as string),
              altitude: JSON.parse(data.altitude_json as string),
              time: JSON.parse(data.time_json as string),
              distance: JSON.parse(data.distance_json as string),
            };
          }
          if (data.latlng) {
            return {
              latlng: data.latlng as [number, number][],
              altitude: data.altitude as number[],
              time: data.time as number[],
              distance: data.distance as number[],
            };
          }
          return null;
        };

        const parseLatlng = (latlngRaw: unknown[]): [number, number][] => {
          const latlng: [number, number][] = [];
          if (latlngRaw.length > 0) {
            if (Array.isArray(latlngRaw[0])) {
              latlng.push(...(latlngRaw as [number, number][]));
            } else if (
              typeof latlngRaw[0] === 'object' &&
              latlngRaw[0] !== null &&
              'lat' in latlngRaw[0]
            ) {
              for (const p of latlngRaw as { lat: number; lng: number }[]) {
                latlng.push([p.lat, p.lng]);
              }
            } else {
              for (let i = 0; i < latlngRaw.length; i += 2) {
                latlng.push([latlngRaw[i] as number, latlngRaw[i + 1] as number]);
              }
            }
          }
          return latlng;
        };

        for (const activity of activitiesData) {
          setFetchingStreams((prev) => ({ ...prev, [activity.id]: true }));
          setStreamErrors((prev) => ({ ...prev, [activity.id]: null }));
          try {
            // Try Firestore first (works without backend server)
            const streamDoc = await getDoc(
              doc(db, 'activities', activity.id.toString(), 'streams', 'data'),
            );
            if (streamDoc.exists()) {
              const parsed = parseStreamData(streamDoc.data());
              if (parsed) {
                streamsData[activity.id] = parsed;
                continue;
              }
            }

            // Fall back to API if Firestore doesn't have the data
            const response = await fetch(`${apiBaseUrl}/api/activities/${activity.id}/streams`);
            if (response.ok) {
              const data = await response.json();
              streamsData[activity.id] = {
                latlng: parseLatlng(data.latlng || []),
                altitude: data.altitude || [],
                time: data.time || [],
                distance: data.distance || [],
              };
            } else {
              throw new Error(`No stream data available (API: ${response.statusText})`);
            }
          } catch (err) {
            console.error(`Error fetching streams for activity ${activity.id}:`, err);
            setStreamErrors((prev) => ({
              ...prev,
              [activity.id]: err instanceof Error ? err.message : 'Failed to load route data',
            }));
          } finally {
            setFetchingStreams((prev) => ({ ...prev, [activity.id]: false }));
          }
        }
        setStreams(streamsData);

        // Fetch photos
        const photosQuery = query(collection(db, 'trips', tripId, 'photos'));
        const photosSnapshot = await getDocs(photosQuery);
        const photosData = photosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Photo[];
        setPhotos(photosData);
      } catch (err) {
        console.error('Error fetching trip data:', err);
        setError('Failed to load trip data');
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center bg-gray-900 h-screen">
        <h2 className="text-2xl font-bold text-white mb-4">{error || 'Trip not found'}</h2>
        <Link to="/trips" className="text-blue-400 hover:underline">
          Back to Trips
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-gray-900 text-gray-100">
      <AnimatePresence mode="wait">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between flex-shrink-0 z-30"
        >
          <div className="flex items-center gap-4">
            <Link
              to="/trips"
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {formatTripName(trip.hashtag, trip.name)}
              </h1>
              <div className="flex items-center text-sm text-gray-400 gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(trip.dateRange.start).toLocaleDateString()}
                  {trip.dateRange.start !== trip.dateRange.end &&
                    ` - ${new Date(trip.dateRange.end).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-800 p-1 rounded-xl shadow-inner border border-gray-700">
              <button
                onClick={() => setActiveView('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                  activeView === 'map'
                    ? 'bg-gray-700 text-blue-400 shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setActiveView('gallery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                  activeView === 'gallery'
                    ? 'bg-gray-700 text-blue-400 shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Gallery</span>
              </button>
            </div>

            {isAdmin() && (
              <>
                <div className="h-8 w-px bg-gray-800 mx-2 hidden sm:block" />

                {pickProgress && (
                  <div className="flex items-center gap-2 text-sm text-blue-400 font-medium hidden sm:flex">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{pickProgress}</span>
                  </div>
                )}
                <button
                  onClick={handleAddPhotos}
                  disabled={isPickingPhotos}
                  aria-label="Add Photos"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 min-h-[44px]"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Photos</span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        {addPhotoError && (
          <div className="px-4 py-2 bg-gray-900 z-30">
            <ErrorBanner message={addPhotoError} onDismiss={() => setAddPhotoError(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* Main Content: Map/Gallery and Stats */}
      <div className="flex flex-col flex-grow min-h-0">
        <AnimatePresence mode="wait">
          {activeView === 'map' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-grow relative"
            >
              {/* Full-bleed map */}
              <div className="absolute inset-0">
                <TripMap
                  activityStreams={streams}
                  highlightedActivityId={activeActivityId}
                  animationState={animationState}
                  onAnimationComplete={() =>
                    setAnimationState((prev) => ({ ...prev, isPlaying: false }))
                  }
                  photos={visiblePhotos}
                  scrubPosition={scrubPosition}
                  onPhotoSelect={(photo) => setMapPreviewPhoto(photo)}
                />
              </div>

              {/* Bottom overlay - elevation background, ride selector, stats, play controls */}
              <div className="absolute bottom-5 left-0 right-[60px] z-10 pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12">
                  <div className="relative isolate pb-3 px-3 sm:px-8">
                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Ride selector */}
                      {activities.length > 1 && (
                        <div className="flex gap-2 pointer-events-auto">
                          <button
                            onClick={() => setActiveActivityId(null)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                              activeActivityId === null
                                ? 'bg-amber-400 text-gray-900'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 backdrop-blur-sm'
                            }`}
                          >
                            All
                          </button>
                          {activities.map((activity, index) => (
                            <button
                              key={activity.id}
                              onClick={() => setActiveActivityId(activity.id)}
                              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                                activeActivityId === activity.id
                                  ? 'text-white'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20 backdrop-blur-sm'
                              }`}
                              style={
                                activeActivityId === activity.id
                                  ? { backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }
                                  : undefined
                              }
                            >
                              Ride {index + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Interactive elevation scrub */}
                      {combinedStreams && (
                        <div className="pointer-events-auto">
                          <ElevationChart
                            distance={combinedStreams.distance}
                            altitude={combinedStreams.altitude}
                            height={80}
                            variant="interactive"
                            showLabels={false}
                            id={`scrub-${activeActivityId ?? 'all'}`}
                            onScrub={handleElevationScrub}
                          />
                        </div>
                      )}

                      {/* Stats + play controls in a single left-aligned row */}
                      <div className="flex items-center gap-3 sm:gap-6 pointer-events-auto">
                        {(() => {
                          const visibleActivities = activities.filter(
                            (a) => activeActivityId === null || a.id === activeActivityId,
                          );
                          const totalDist = visibleActivities.reduce((s, a) => s + a.distance, 0);
                          const totalElev = visibleActivities.reduce(
                            (s, a) => s + a.total_elevation_gain,
                            0,
                          );
                          const totalTime = visibleActivities.reduce(
                            (s, a) => s + a.elapsed_time,
                            0,
                          );
                          return (
                            <>
                              <span className="flex items-center gap-2 text-base sm:text-2xl font-bold text-amber-300">
                                <Bike className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400/70" />
                                {metersToMiles(totalDist).toFixed(1)}{' '}
                                <span className="text-amber-300/50 text-xs sm:text-base font-normal">mi</span>
                              </span>
                              <span className="flex items-center gap-2 text-base sm:text-2xl font-bold text-amber-300">
                                <Mountain className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400/70" />
                                {Math.round(metersToFeet(totalElev)).toLocaleString()}{' '}
                                <span className="text-amber-300/50 text-xs sm:text-base font-normal">ft</span>
                              </span>
                              <span className="text-base sm:text-2xl font-bold text-amber-300">
                                {secondsToDuration(totalTime)}
                              </span>
                            </>
                          );
                        })()}

                        <div className="w-px h-6 bg-amber-400/20" />

                        {activities
                          .filter((a) => activeActivityId === null || a.id === activeActivityId)
                          .map((activity) => (
                            <button
                              key={activity.id}
                              onClick={() => handlePlayPause(activity.id)}
                              className={`p-1.5 transition-colors flex items-center justify-center ${
                                animationState.activityId === activity.id &&
                                animationState.isPlaying
                                  ? 'text-red-500 hover:text-red-400'
                                  : 'text-red-500 hover:text-red-400'
                              }`}
                              title={
                                animationState.activityId === activity.id &&
                                animationState.isPlaying
                                  ? 'Pause'
                                  : 'Play'
                              }
                            >
                              {animationState.activityId === activity.id &&
                              animationState.isPlaying ? (
                                <Pause className="w-6 h-6" fill="currentColor" />
                              ) : (
                                <Play className="w-6 h-6" fill="currentColor" />
                              )}
                            </button>
                          ))}
                        <button
                          onClick={() => toggleSpeed()}
                          className={`p-1.5 transition-colors flex items-center justify-center ${
                            animationState.speed > 1
                              ? 'text-red-500'
                              : 'text-red-500 hover:text-red-400'
                          }`}
                          title="Toggle Speed (1x/2x)"
                        >
                          <FastForward className="w-5 h-5" fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="gallery-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex-grow overflow-y-auto"
            >
              <PhotoGallery photos={photos} onPhotoClick={setSelectedGalleryPhoto} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map photo preview */}
        {mapPreviewPhoto && (
          <div
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer"
            onClick={() => setMapPreviewPhoto(null)}
          >
            <div
              className="relative max-w-[80vw] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={mapPreviewPhoto.downloadUrl}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl cursor-pointer"
                onClick={() => {
                  setMapPreviewPhoto(null);
                  setActiveView('gallery');
                  setSelectedGalleryPhoto(mapPreviewPhoto);
                }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
                {new Date(mapPreviewPhoto.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Photo Overlay */}
        {selectedGalleryPhoto && (
          <LightboxOverlay
            photo={selectedGalleryPhoto}
            photos={photos}
            onClose={() => setSelectedGalleryPhoto(null)}
            onNavigate={setSelectedGalleryPhoto}
          />
        )}
      </div>
    </div>
  );
};
