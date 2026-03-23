import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Activity, ActivityStreams } from '../types';
import { ChevronLeft, Calendar, Play, Pause, FastForward } from 'lucide-react';
import { metersToFeet, metersToMiles, metersToKm, secondsToDuration } from '../utils/units';
import { TripMap } from '../components/Map/TripMap';
import { ElevationChart } from '../components/ElevationChart';

export const TripDetail: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [streams, setStreams] = useState<Record<number, ActivityStreams>>({});
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
        for (const activity of activitiesData) {
          const streamDoc = await getDoc(doc(db, 'activities', activity.id.toString(), 'streams', 'data'));
          if (streamDoc.exists()) {
            const data = streamDoc.data();
            const latlngRaw = data.latlng || [];
            // Handle both nested and flat arrays from Firestore
            const latlng: [number, number][] = [];
            if (latlngRaw.length > 0) {
              if (Array.isArray(latlngRaw[0])) {
                latlng.push(...latlngRaw);
              } else {
                for (let i = 0; i < latlngRaw.length; i += 2) {
                  latlng.push([latlngRaw[i], latlngRaw[i+1]]);
                }
              }
            }
            
            streamsData[activity.id] = {
              ...data,
              latlng
            } as ActivityStreams;
          }
        }
        setStreams(streamsData);

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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Trip not found'}</h2>
        <Link to="/trips" className="text-blue-600 hover:underline">Back to Trips</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {trip.hashtag ? `#${trip.hashtag}` : trip.name}
            </h1>
            <div className="flex items-center text-sm text-gray-500 gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(trip.dateRange.start).toLocaleDateString()}
                {trip.dateRange.start !== trip.dateRange.end && ` - ${new Date(trip.dateRange.end).toLocaleDateString()}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Map and Stats */}
      <div className="flex flex-grow overflow-hidden relative">
        <div className="flex-grow bg-gray-200 relative">
          <TripMap 
            activityStreams={streams}
            mapId="trip_map"
            highlightedActivityId={activeActivityId}
            animationState={animationState}
            onAnimationComplete={() => setAnimationState(prev => ({ ...prev, isPlaying: false }))}
          />
          
          {/* Overlay Day Navigation (if multi-day) */}
          {activities.length > 1 && (
            <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
              {activities.map((activity, index) => (
                <button
                  key={activity.id}
                  onClick={() => setActiveActivityId(activity.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${
                    activeActivityId === activity.id
                      ? 'bg-blue-600 text-white scale-105'
                      : 'bg-white/90 text-gray-700 hover:bg-white backdrop-blur-sm'
                  }`}
                >
                  Day {index + 1}
                </button>
              ))}
              <button
                onClick={() => setActiveActivityId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${
                  activeActivityId === null
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-white/90 text-gray-700 hover:bg-white backdrop-blur-sm'
                }`}
              >
                All
              </button>
            </div>
          )}

          {/* Overlay Stats Panel */}
          <div className="absolute bottom-6 right-6 z-10 w-80 max-h-[calc(100%-48px)] overflow-y-auto pointer-events-none">
            {activities
              .filter(a => activeActivityId === null || a.id === activeActivityId)
              .map((activity) => {
                const dayIndex = activities.findIndex(a => a.id === activity.id);
                return (
                  <div 
                    key={activity.id} 
                    className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-5 mb-4 pointer-events-auto border border-white/20 transition-all duration-300 transform"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {activities.length > 1 ? `Day ${dayIndex + 1}: ` : ''}{activity.name}
                      </h3>
                      
                      {/* Animation Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSpeed()}
                          className={`p-1.5 rounded-lg transition-colors ${
                            animationState.speed > 1 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                          }`}
                          title="Toggle Speed (1x/2x)"
                        >
                          <FastForward className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePlayPause(activity.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            animationState.activityId === activity.id && animationState.isPlaying
                              ? 'bg-red-100 text-red-600 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          {animationState.activityId === activity.id && animationState.isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Distance</p>
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-gray-900 leading-none">
                            {metersToMiles(activity.distance).toFixed(1)} <span className="text-xs font-medium text-gray-500">mi</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {metersToKm(activity.distance).toFixed(1)} km
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Elevation</p>
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-gray-900 leading-none">
                            {Math.round(metersToFeet(activity.total_elevation_gain)).toLocaleString()} <span className="text-xs font-medium text-gray-500">ft</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(activity.total_elevation_gain).toLocaleString()} m
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Time</p>
                        <p className="text-lg font-bold text-gray-900 leading-none">
                          {secondsToDuration(activity.elapsed_time)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Date</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(activity.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Elevation Chart */}
                    {streams[activity.id] && streams[activity.id].altitude && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Elevation Profile</p>
                        <ElevationChart 
                          distance={streams[activity.id].distance} 
                          altitude={streams[activity.id].altitude} 
                          height={80}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
