import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  documentId,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Activity } from '../types';
import { ChevronDown, Mountain, Bike } from 'lucide-react';
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

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (start === end) return s.toLocaleDateString('en-US', opts);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', opts)}`;
};

const ElevationLine: React.FC<{
  altitude: number[];
  distance: number[];
  height?: number;
  opacity?: number;
  className?: string;
}> = ({ altitude, distance, height = 40, opacity = 0.3, className = '' }) => {
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

export const Home: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripPhotos, setTripPhotos] = useState<Record<string, Photo>>({});
  const [tripStats, setTripStats] = useState<
    Record<string, { distance: number; elevation: number; name: string }>
  >({});
  const [tripElevations, setTripElevations] = useState<
    Record<string, { altitude: number[]; distance: number[] }>
  >({});
  const [heroIndex, setHeroIndex] = useState<number>(-1);
  const [ready, setReady] = useState(false);
  const [cardVisible, setCardVisible] = useState<Record<string, boolean>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'trips'), orderBy('dateRange.start', 'desc'));
        const snapshot = await getDocs(q);
        const tripsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Trip[];
        setTrips(tripsData);

        const photos: Record<string, Photo> = {};
        await Promise.all(
          tripsData.map(async (trip) => {
            try {
              const photosSnapshot = await getDocs(collection(db, 'trips', trip.id, 'photos'));
              if (!photosSnapshot.empty) {
                const allPhotos = photosSnapshot.docs.map(
                  (d) => ({ id: d.id, ...d.data() }) as Photo,
                );
                // Filter out videos for hero background (they have play button overlay on thumbnails)
                const photoOnly = allPhotos.filter((p) => p.mediaType !== 'video');
                const geoPhoto = photoOnly.find((p) => p.lat !== null && p.lng !== null);
                photos[trip.id] = geoPhoto || photoOnly[0];
              }
            } catch (err) {
              console.error(`Photo query failed for ${trip.id}:`, err);
            }
          }),
        );
        setTripPhotos(photos);

        // Only keep trips that have at least one photo
        const tripsWithPhotos = tripsData.filter((t) => photos[t.id]);
        setTrips(tripsWithPhotos);

        // Pick a random hero from trips that have photos
        if (tripsWithPhotos.length > 0) {
          const randomIdx = Math.floor(Math.random() * tripsWithPhotos.length);
          setHeroIndex(randomIdx);
        }

        // Fetch stats for trips with photos
        const stats: Record<string, { distance: number; elevation: number; name: string }> = {};
        await Promise.all(
          tripsWithPhotos.map(async (trip) => {
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
              let firstName = '';
              snap.docs.forEach((d) => {
                const a = d.data() as Activity;
                totalDist += a.distance || 0;
                totalElev += a.total_elevation_gain || 0;
                if (!firstName) firstName = a.name || '';
              });
              stats[trip.id] = { distance: totalDist, elevation: totalElev, name: firstName };
            } catch {
              /* skip */
            }
          }),
        );
        setTripStats(stats);

        // Fetch elevation data for trips with photos
        const elevations: Record<string, { altitude: number[]; distance: number[] }> = {};
        await Promise.all(
          tripsWithPhotos.map(async (trip) => {
            const elev = await fetchElevationForTrip(trip.activityIds);
            if (elev) elevations[trip.id] = elev;
          }),
        );
        setTripElevations(elevations);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setReady(true);
      }
    };

    fetchData();
  }, []);

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-trip-id');
        if (id) setCardVisible((prev) => ({ ...prev, [id]: true }));
      }
    });
  }, []);

  useEffect(() => {
    if (!gridRef.current || trips.length === 0) return;
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.15 });
    const cards = gridRef.current.querySelectorAll('[data-trip-id]');
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [trips, observerCallback]);

  const heroTrip = heroIndex >= 0 ? trips[heroIndex] : null;
  const heroPhoto = heroTrip ? tripPhotos[heroTrip.id] : null;
  const heroElevation = heroTrip ? tripElevations[heroTrip.id] : null;

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Hero */}
      <section className="relative h-screen w-full overflow-hidden">
        {heroPhoto ? (
          <img
            src={heroPhoto.downloadUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 to-gray-900" />
        )}

        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {heroTrip?.summaryPolylines && heroTrip.summaryPolylines.length > 0 && (
          <RouteOverlay
            polylines={heroTrip.summaryPolylines}
            strokeColor="#ffffff"
            strokeOpacity={0.4}
            strokeWidth={2.5}
            glowOpacity={0.2}
            padding={15}
          />
        )}

        {/* Dark gradient behind elevation line / header area */}
        <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

        {heroElevation && (
          <ElevationLine
            altitude={heroElevation.altitude}
            distance={heroElevation.distance}
            height={80}
            opacity={0.3}
            className="top-16"
          />
        )}

        <div
          className={`absolute bottom-0 left-0 right-0 p-8 sm:p-16 transition-all duration-1000 ease-out ${
            ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h1 className="text-3xl sm:text-5xl font-extralight text-white tracking-tight mb-6">
            by Dave Primmer
          </h1>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-white/40" />
        </div>
      </section>

      {/* Trip Grid */}
      <section className="px-4 sm:px-8 lg:px-16 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-light text-white mb-4">Recent Journeys</h2>
          <hr className="border-gray-800 mb-12" />

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip, i) => {
              const photo = tripPhotos[trip.id];
              const visible = cardVisible[trip.id];
              const stats = tripStats[trip.id];
              const elev = tripElevations[trip.id];
              return (
                <Link
                  key={trip.id}
                  to={`/trip/${trip.id}`}
                  data-trip-id={trip.id}
                  onClick={() => logTripCardClick(trip.id, 'home')}
                  className={`group relative overflow-hidden aspect-[3/2] block bg-gray-900 rounded-lg transition-all duration-700 ease-out ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {photo ? (
                    <img
                      src={photo.downloadUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

                  {/* Bottom info - date */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-sm text-white/50">
                      {formatDateRange(trip.dateRange.start, trip.dateRange.end)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
