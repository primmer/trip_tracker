import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip } from '../types';
import { RefreshCw, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api';
import { ErrorBanner } from '../components/ErrorBanner';

export const Trips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Your Trips</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync with Strava'}
        </button>
      </div>

      {syncError && (
        <ErrorBanner 
          message={syncError} 
          onDismiss={() => setSyncError(null)} 
        />
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


