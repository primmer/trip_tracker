import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Activity, ActivityStreams } from '../types';
import { Photo } from '../components/Map/PhotoMarkers';
import { ChevronLeft, Calendar, Play, Pause, FastForward, ImagePlus, Loader2, Map as MapIcon, Grid, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { metersToFeet, metersToMiles, metersToKm, secondsToDuration } from '../utils/units';
import { TripMap } from '../components/Map/TripMap';
import { PhotoGallery } from '../components/PhotoGallery';
import { ErrorBanner } from '../components/ErrorBanner';
import { ElevationChart } from '../components/ElevationChart';
import { getApiBaseUrl } from '../utils/api';

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
  const [fetchingStreams, setFetchingStreams] = useState<Record<number, boolean>>({});
  const [streamErrors, setStreamErrors] = useState<Record<number, string | null>>({});
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);

  const handleAddPhotos = async () => {
    if (!tripId) return;
    setIsPickingPhotos(true);
    setPickProgress('Checking connection...');
    const apiBaseUrl = getApiBaseUrl();
    try {
      // 0. Pre-check backend health
      try {
        const healthResponse = await fetch(`${apiBaseUrl}/health`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!healthResponse.ok) throw new Error('Backend health check failed');
      } catch (err) {
        throw new Error('Backend server not running. Start it with: cd functions && node lib/dev-server.js');
      }

      // 1. Create Picker Session
      setPickProgress('Creating session...');
      const response = await fetch(`${apiBaseUrl}/api/photos/picker-session`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create picker session');
      const session = await response.json();
      
      // 2. Open Picker in new window
      const pickerWindow = window.open(session.pickerUri, 'Google Photos Picker', 'width=800,height=600');
      if (!pickerWindow) {
        throw new Error('Please enable popups to use the photo picker');
      }

      setPickProgress('Waiting for selection...');
      
      // 3. Poll session for completion
      let closedPollCount = 0;
      const MAX_CLOSED_POLLS = 10; // Keep polling up to 30s after window closes
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
            const photosData = photosSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Photo[];
            setPhotos(photosData);

            setTimeout(() => {
              setPickProgress(null);
              setIsPickingPhotos(false);
            }, 2000);
          } else if (pickerWindow.closed) {
            closedPollCount++;
            setPickProgress(`Finalizing (${closedPollCount}/${MAX_CLOSED_POLLS})...`);
            if (closedPollCount >= MAX_CLOSED_POLLS) {
              clearInterval(pollInterval);
              setPickProgress(null);
              setIsPickingPhotos(false);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
          clearInterval(pollInterval);
          setIsPickingPhotos(false);
          setPickProgress(null);
        }
      }, 3000);

    } catch (err) {
      console.error('Error adding photos:', err);
      setAddPhotoError(err instanceof Error ? err.message : 'Failed to add photos');
      setIsPickingPhotos(false);
      setPickProgress(null);
    }
  };

  const handlePlayPause = (activityId: number) => {
    setAnimationState(prev => ({
      ...prev,
      activityId,
      isPlaying: prev.activityId === activityId ? !prev.isPlaying : true
    }));
  };

  const toggleSpeed = () => {
    setAnimationState(prev => ({
      ...prev,
      speed: prev.speed === 1 ? 2 : 1
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
          where(documentId(), 'in', tripData.activityIds.map(id => id.toString()))
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData = activitiesSnapshot.docs.map(doc => ({
          id: parseInt(doc.id),
          ...doc.data()
        })) as Activity[];
        
        // Sort activities by date
        activitiesData.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        setActivities(activitiesData);
        if (activitiesData.length > 0) {
          setActiveActivityId(activitiesData[0].id);
        }

        // Fetch streams for each activity
        const streamsData: Record<number, ActivityStreams> = {};
        const apiBaseUrl = getApiBaseUrl();
        for (const activity of activitiesData) {
          setFetchingStreams(prev => ({ ...prev, [activity.id]: true }));
          setStreamErrors(prev => ({ ...prev, [activity.id]: null }));
          try {
            const response = await fetch(`${apiBaseUrl}/api/activities/${activity.id}/streams`);
            if (response.ok) {
              const data = await response.json();
              // Support both nested and flat arrays from Firestore
              const latlngRaw = data.latlng || [];
              const latlng: [number, number][] = [];
              if (latlngRaw.length > 0) {
                if (Array.isArray(latlngRaw[0])) {
                  latlng.push(...latlngRaw);
                } else if (typeof latlngRaw[0] === 'object' && 'lat' in latlngRaw[0]) {
                  for (const p of latlngRaw) {
                    latlng.push([p.lat, p.lng]);
                  }
                } else {
                  for (let i = 0; i < latlngRaw.length; i += 2) {
                    latlng.push([latlngRaw[i], latlngRaw[i+1]]);
                  }
                }
              }
              
              streamsData[activity.id] = {
                latlng,
                altitude: data.altitude || [],
                time: data.time || [],
                distance: data.distance || [],
              } as ActivityStreams;
            } else {
              // Try falling back to reading directly from Firestore if API fails
              console.log(`API failed for activity ${activity.id}, falling back to Firestore...`);
              const streamDoc = await getDoc(doc(db, 'activities', activity.id.toString(), 'streams', 'data'));
              if (streamDoc.exists()) {
                const data = streamDoc.data();
                if (data.latlng_json) {
                  streamsData[activity.id] = {
                    latlng: JSON.parse(data.latlng_json),
                    altitude: JSON.parse(data.altitude_json),
                    time: JSON.parse(data.time_json),
                    distance: JSON.parse(data.distance_json),
                  } as ActivityStreams;
                } else if (data.latlng) {
                  streamsData[activity.id] = {
                    latlng: data.latlng,
                    altitude: data.altitude,
                    time: data.time,
                    distance: data.distance,
                  } as ActivityStreams;
                }
              } else {
                throw new Error(`Failed to fetch streams: ${response.statusText}`);
              }
            }
          } catch (err) {
            console.error(`Error fetching streams for activity ${activity.id}:`, err);
            setStreamErrors(prev => ({ ...prev, [activity.id]: err instanceof Error ? err.message : 'Failed to load route data' }));
          } finally {
            setFetchingStreams(prev => ({ ...prev, [activity.id]: false }));
          }
        }
        setStreams(streamsData);

        // Fetch photos
        const photosQuery = query(collection(db, 'trips', tripId, 'photos'));
        const photosSnapshot = await getDocs(photosQuery);
        const photosData = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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
        <Link to="/trips" className="text-blue-400 hover:underline">Back to Trips</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <AnimatePresence mode="wait">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between flex-shrink-0 z-30"
        >
          <div className="flex items-center gap-4">
            <Link to="/trips" className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {trip.hashtag ? `#${trip.hashtag}` : trip.name}
              </h1>
              <div className="flex items-center text-sm text-gray-400 gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(trip.dateRange.start).toLocaleDateString()}
                  {trip.dateRange.start !== trip.dateRange.end && ` - ${new Date(trip.dateRange.end).toLocaleDateString()}`}
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 min-h-[44px]"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Photos</span>
            </button>
          </div>
        </motion.div>

        {addPhotoError && (
          <div className="px-4 py-2 bg-gray-900 z-30">
            <ErrorBanner 
              message={addPhotoError} 
              onDismiss={() => setAddPhotoError(null)} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main Content: Map/Gallery and Stats */}
      <div className="flex flex-col flex-grow">
        <AnimatePresence mode="wait">
          {activeView === 'map' ? (
            <motion.div 
              key="map-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col"
            >
              <div className="w-full max-w-5xl mx-auto px-4 mt-6">
                <div className="aspect-square md:aspect-video max-h-[600px] relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                  <TripMap 
                    activityStreams={streams}
                    mapId="trip_map"
                    highlightedActivityId={activeActivityId}
                    animationState={animationState}
                    onAnimationComplete={() => setAnimationState(prev => ({ ...prev, isPlaying: false }))}
                    photos={photos}
                  />
                </div>
                
                {/* Day Navigation below map */}
                {activities.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {activities.map((activity, index) => (
                      <button
                        key={activity.id}
                        onClick={() => setActiveActivityId(activity.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                          activeActivityId === activity.id
                            ? 'bg-blue-600 text-white scale-105'
                            : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 backdrop-blur-sm border border-gray-700'
                        }`}
                      >
                        Day {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveActivityId(null)}
                      className={`px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        activeActivityId === null
                          ? 'bg-blue-600 text-white scale-105'
                          : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 backdrop-blur-sm border border-gray-700'
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}
              </div>

              {/* Stats Section below map */}
              <div className="bg-gray-900 p-6 mt-6">
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activities
                      .filter(a => activeActivityId === null || a.id === activeActivityId)
                      .map((activity) => {
                        const dayIndex = activities.findIndex(a => a.id === activity.id);
                        return (
                          <div 
                            key={activity.id} 
                            className="bg-gray-900 rounded-xl shadow-lg p-5 border border-gray-800 transition-all duration-300 hover:border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-white text-base leading-tight">
                                {activities.length > 1 ? `Day ${dayIndex + 1}: ` : ''}{activity.name}
                              </h3>
                              
                              {/* Animation Controls */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleSpeed()}
                                  className={`p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    animationState.speed > 1 ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                  }`}
                                  title="Toggle Speed (1x/2x)"
                                >
                                  <FastForward className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handlePlayPause(activity.id)}
                                  className={`p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    animationState.activityId === activity.id && animationState.isPlaying
                                      ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                                      : 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60'
                                  }`}
                                  title={animationState.activityId === activity.id && animationState.isPlaying ? 'Pause' : 'Play'}
                                >
                                  {animationState.activityId === activity.id && animationState.isPlaying ? (
                                    <Pause className="w-6 h-6" />
                                  ) : (
                                    <Play className="w-6 h-6" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                              <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Distance</p>
                                <div className="flex flex-col">
                                  <span className="text-lg font-bold text-white leading-none">
                                    {metersToMiles(activity.distance).toFixed(1)} <span className="text-xs font-medium text-gray-500">mi</span>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {metersToKm(activity.distance).toFixed(1)} km
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Elevation</p>
                                <div className="flex flex-col">
                                  <span className="text-lg font-bold text-white leading-none">
                                    {Math.round(metersToFeet(activity.total_elevation_gain)).toLocaleString()} <span className="text-xs font-medium text-gray-500">ft</span>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {Math.round(activity.total_elevation_gain).toLocaleString()} m
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Time</p>
                                <p className="text-lg font-bold text-white leading-none">
                                  {secondsToDuration(activity.elapsed_time)}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Date</p>
                                <p className="text-sm font-bold text-white">
                                  {new Date(activity.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Elevation Chart */}
                            {streams[activity.id] && streams[activity.id].altitude && (
                              <div className="mt-4 pt-4 border-t border-gray-800">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Elevation Profile</p>
                                <ElevationChart 
                                  distance={streams[activity.id].distance} 
                                  altitude={streams[activity.id].altitude} 
                                  height={60}
                                />
                              </div>
                            )}

                            {fetchingStreams[activity.id] && (
                              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-center gap-2 text-blue-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-medium">Loading route data...</span>
                              </div>
                            )}

                            {streamErrors[activity.id] && (
                              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">{streamErrors[activity.id]}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
              className="flex-grow"
            >
              <PhotoGallery photos={photos} onPhotoClick={setSelectedGalleryPhoto} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Photo Overlay */}
        {selectedGalleryPhoto && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300"
            onClick={() => setSelectedGalleryPhoto(null)}
          >
            <div className="relative max-w-[90vw] max-h-[80vh] group">
              <img 
                src={selectedGalleryPhoto.downloadUrl} 
                alt={selectedGalleryPhoto.filename}
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button 
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-[110]"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGalleryPhoto(null);
                }}
                aria-label="Close fullscreen view"
              >
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </button>
            </div>
            
            <div className="mt-8 text-center text-white space-y-2 px-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold">{selectedGalleryPhoto.filename}</h3>
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedGalleryPhoto.createdAt).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Grid className="w-4 h-4" />
                  <span>{new Date(selectedGalleryPhoto.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
