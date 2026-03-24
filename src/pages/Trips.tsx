import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip } from '../types';
import { RefreshCw, MapPin, Calendar, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api';
import { ErrorBanner } from '../components/ErrorBanner';

export const Trips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [enhanceSuccess, setEnhanceSuccess] = useState<string | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'trips'), orderBy('dateRange.start', 'desc'));
      const querySnapshot = await getDocs(q);
      const tripsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trip[];
      setTrips(tripsData);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/strava/sync`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Sync failed');
      await fetchTrips();
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncError('Failed to sync with Strava. Please check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    setSyncError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/activities/enhance-descriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Enhancement failed');
      const data = await response.json();
      setEnhanceSuccess(data.message || 'Enhancement complete!');
      await fetchTrips();
    } catch (error) {
      console.error('Error enhancing:', error);
      setSyncError('Failed to enhance descriptions. Please check your connection and try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Your Trips</h1>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleEnhance}
            disabled={enhancing || syncing}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-all min-h-[44px] min-w-[44px] font-bold shadow-lg"
          >
            <Sparkles className={`w-5 h-5 ${enhancing ? 'animate-pulse' : ''}`} />
            <span>{enhancing ? 'Enhancing...' : 'Enhance Titles'}</span>
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || enhancing}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all min-h-[44px] min-w-[44px] font-bold shadow-lg"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync with Strava'}</span>
          </button>
        </div>
      </div>

      {syncError && (
        <ErrorBanner 
          message={syncError} 
          onDismiss={() => setSyncError(null)} 
        />
      )}

      {enhanceSuccess && (
        <div className="bg-green-900/20 border-l-4 border-green-500 p-4 mb-6 flex justify-between items-start animate-in fade-in slide-in-from-top duration-300 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-200 font-medium">
                {enhanceSuccess}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEnhanceSuccess(null)}
            className="ml-auto pl-3 text-green-400 hover:text-green-300 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64" role="status">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="sr-only">Loading trips...</span>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-gray-800 rounded-lg shadow-sm p-12 text-center border border-gray-700">
          <p className="text-gray-400 text-lg">No trips yet. Sync with Strava to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trip/${trip.id}`}
              className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700 hover:shadow-md hover:border-gray-600 transition-all group"
            >
              <div className="h-48 bg-gray-900 flex items-center justify-center text-gray-600 group-hover:bg-gray-700 transition-colors">
                <MapPin className="w-12 h-12" />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-white truncate">
                    {trip.hashtag ? `#${trip.hashtag}` : 'Individual Ride'}
                  </h2>
                  <span className="bg-blue-900/30 text-blue-400 text-xs font-semibold px-2 py-1 rounded">
                    {trip.activityIds.length} {trip.activityIds.length === 1 ? 'ride' : 'rides'}
                  </span>
                </div>
                <div className="flex items-center text-gray-400 text-sm gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(trip.dateRange.start)}
                    {trip.dateRange.start !== trip.dateRange.end && ` - ${formatDate(trip.dateRange.end)}`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};


