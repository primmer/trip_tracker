import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip } from '../types';
import { Calendar, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StaticMap } from '../components/StaticMap';

export const Trips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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

  const groupedTrips = useMemo(() => {
    const groups: { [key: string]: Trip[] } = {};
    trips.forEach(trip => {
      const date = new Date(trip.dateRange.start);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(trip);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].dateRange.start);
      const dateB = new Date(b[1][0].dateRange.start);
      return dateB.getTime() - dateA.getTime();
    });
  }, [trips]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 bg-gray-950 min-h-screen">
      <header className="mb-16">
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">Trips</h1>
        <p className="text-gray-500 font-medium">Archived adventures and daily escapes.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64" role="status">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          <span className="sr-only">Loading trips...</span>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-gray-900 p-16 text-center border border-gray-800">
          <p className="text-gray-500 text-lg">No trips yet. Sync with Strava to get started.</p>
        </div>
      ) : (
        <div className="space-y-20">
          {groupedTrips.map(([monthYear, monthTrips]) => (
            <section key={monthYear}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-8 pb-2 border-b border-gray-900">
                {monthYear}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12">
                {monthTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="group block relative overflow-hidden bg-gray-900 aspect-video transition-all"
                  >
                    {/* Map Background */}
                    <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                      {trip.summaryPolylines && trip.summaryPolylines.length > 0 ? (
                        <StaticMap 
                          polylines={trip.summaryPolylines} 
                          strokeColor="#60a5fa" 
                          strokeWeight={2.5}
                          padding={40}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-800">
                          <Layers className="w-16 h-16 opacity-10" />
                        </div>
                      )}
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <div className="flex justify-between items-end">
                        <div>
                          <h3 className="text-2xl font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">
                            {trip.hashtag ? `#${trip.hashtag}` : trip.name}
                          </h3>
                          <div className="flex items-center text-gray-400 text-sm font-light gap-3">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(trip.dateRange.start)}
                              {trip.dateRange.start !== trip.dateRange.end && ` - ${formatDate(trip.dateRange.end)}`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold tracking-widest uppercase text-gray-500 block mb-1">
                            {trip.activityIds.length} {trip.activityIds.length === 1 ? 'ride' : 'rides'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};


