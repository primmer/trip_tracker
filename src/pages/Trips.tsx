import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  documentId,
  limit,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Activity } from '../types';
import { Mountain, Bike } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RouteOverlay } from '../components/RouteOverlay';
import { metersToMiles, metersToFeet, formatTripName } from '../utils/units';
import { logTripCardClick } from '../utils/analytics';

interface Photo {
  id: string;
  filename: string;
  downloadUrl: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  mediaType?: 'photo' | 'video';
}

const ElevationLine: React.FC<{
  altitude: number[];
  distance: number[];
  height?: number;
  opacity?: number;
  className?: string;
}> = ({ altitude, distance, height = 40, opacity = 0.25, className = '' }) => {
  const points = useMemo(() => {
    if (!altitude || !distance || altitude.length < 2) return '';
    const len = Math.min(altitude.length, distance.length);
    const minAlt = Math.min(...altitude.slice(0, len));
    const maxAlt = Math.max(...altitude.slice(0, len));
    const altRange = maxAlt - minAlt || 1;
    const maxDist = distance[len - 1];
    const minDist = distance[0];
    const distRange = maxDist - minDist || 1;

    const step = Math.max(1, Math.floor(len / 200));
    const pts: string[] = [];
    for (let i = 0; i < len; i += step) {
      const x = ((distance[i] - minDist) / distRange) * 100;
      const y = 100 - ((altitude[i] - minAlt) / altRange) * 100;
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ');
  }, [altitude, distance]);

  if (!points) return null;

  return (
    <div className={`absolute left-0 right-0 pointer-events-none ${className}`} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          stroke="white"
          strokeOpacity={opacity}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

async function fetchElevationForTrip(
  activityIds: number[],
): Promise<{ altitude: number[]; distance: number[] } | null> {
  if (activityIds.length === 0) return null;
  try {
    const combinedAltitude: number[] = [];
    const combinedDistance: number[] = [];
    for (const actId of activityIds) {
      const streamDoc = await getDoc(doc(db, 'activities', actId.toString(), 'streams', 'data'));
      if (streamDoc.exists()) {
        const data = streamDoc.data();
        const alt =
          typeof data.altitude_json === 'string' ? JSON.parse(data.altitude_json) : data.altitude;
        const dist =
          typeof data.distance_json === 'string' ? JSON.parse(data.distance_json) : data.distance;
        if (Array.isArray(alt) && Array.isArray(dist)) {
          const offset =
            combinedDistance.length > 0 ? combinedDistance[combinedDistance.length - 1] : 0;
          combinedAltitude.push(...alt);
          combinedDistance.push(...dist.map((d: number) => d + offset));
        }
      }
    }
    if (combinedAltitude.length > 0)
      return { altitude: combinedAltitude, distance: combinedDistance };
  } catch {
    /* skip */
  }
  return null;
}

export const Trips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripPhotos, setTripPhotos] = useState<Record<string, Photo>>({});
  const [tripStats, setTripStats] = useState<
    Record<string, { distance: number; elevation: number }>
  >({});
  const [tripElevations, setTripElevations] = useState<
    Record<string, { altitude: number[]; distance: number[] }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'trips'), orderBy('dateRange.start', 'desc'));
        const querySnapshot = await getDocs(q);
        const tripsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trip[];
        setTrips(tripsData);

        const photos: Record<string, Photo> = {};
        await Promise.all(
          tripsData.map(async (trip) => {
            try {
              const photosQuery = query(
                collection(db, 'trips', trip.id, 'photos'),
                orderBy('createdAt', 'asc'),
                limit(10),
              );
              const snap = await getDocs(photosQuery);
              if (!snap.empty) {
                const allPhotos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo);
                // Filter out videos for tile backgrounds (they have play button overlay)
                const photoOnly = allPhotos.filter((p) => p.mediaType !== 'video');
                const geoPhoto = photoOnly.find((p) => p.lat !== null && p.lng !== null);
                photos[trip.id] = geoPhoto || photoOnly[0];
              }
            } catch {
              /* skip */
            }
          }),
        );
        setTripPhotos(photos);

        const stats: Record<string, { distance: number; elevation: number }> = {};
        await Promise.all(
          tripsData.map(async (trip) => {
            try {
              const ids = trip.activityIds.map((id) => id.toString());
              if (ids.length === 0) return;
              const batch = ids.slice(0, 30);
              const activitiesQuery = query(
                collection(db, 'activities'),
                where(documentId(), 'in', batch),
              );
              const snap = await getDocs(activitiesQuery);
              let totalDist = 0;
              let totalElev = 0;
              snap.docs.forEach((d) => {
                const a = d.data() as Activity;
                totalDist += a.distance || 0;
                totalElev += a.total_elevation_gain || 0;
              });
              stats[trip.id] = { distance: totalDist, elevation: totalElev };
            } catch {
              /* skip */
            }
          }),
        );
        setTripStats(stats);

        // Fetch elevation data for all trips
        const elevations: Record<string, { altitude: number[]; distance: number[] }> = {};
        await Promise.all(
          tripsData.map(async (trip) => {
            const elev = await fetchElevationForTrip(trip.activityIds);
            if (elev) elevations[trip.id] = elev;
          }),
        );
        setTripElevations(elevations);
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const groupedTrips = useMemo(() => {
    const groups: { [key: string]: Trip[] } = {};
    trips.forEach((trip) => {
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
      year: 'numeric',
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {monthTrips.map((trip) => {
                  const photo = tripPhotos[trip.id];
                  const stats = tripStats[trip.id];
                  const elev = tripElevations[trip.id];
                  return (
                    <Link
                      key={trip.id}
                      to={`/trip/${trip.id}`}
                      onClick={() => logTripCardClick(trip.id, 'trips')}
                      className="group block relative overflow-hidden bg-gray-900 aspect-[3/2] rounded-lg transition-all"
                    >
                      {photo ? (
                        <img
                          src={photo.downloadUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/15 to-transparent" />

                      {/* Trip info - top left */}
                      <div className="absolute top-0 left-0 p-5">
                        <p className="text-white text-base font-semibold leading-snug max-w-[280px]">
                          {formatTripName(trip.hashtag, trip.name)}
                        </p>
                        {stats && (
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Bike className="w-2.5 h-2.5 text-white/50" />
                              <p className="text-white/50 text-[11px] leading-tight">
                                {metersToMiles(stats.distance).toFixed(1)} mi
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mountain className="w-2.5 h-2.5 text-white/50" />
                              <p className="text-white/50 text-[11px] leading-tight">
                                {Math.round(metersToFeet(stats.elevation)).toLocaleString()} ft
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Route overlay */}
                      {trip.summaryPolylines && trip.summaryPolylines.length > 0 && (
                        <RouteOverlay
                          polylines={trip.summaryPolylines}
                          strokeColor="#ffffff"
                          strokeOpacity={0.5}
                          strokeWidth={2}
                          glowOpacity={0.25}
                          padding={15}
                        />
                      )}

                      {/* Elevation line at bottom */}
                      {elev && (
                        <ElevationLine
                          altitude={elev.altitude}
                          distance={elev.distance}
                          height={40}
                          opacity={0.25}
                          className="bottom-0"
                        />
                      )}

                      {/* Date - bottom left */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="text-sm text-white/50">
                          {formatDate(trip.dateRange.start)}
                          {trip.dateRange.start !== trip.dateRange.end &&
                            ` – ${formatDate(trip.dateRange.end)}`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
