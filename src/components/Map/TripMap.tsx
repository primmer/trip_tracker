import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map, useMap, MapProps, Marker } from '@vis.gl/react-google-maps';
import { ActivityStreams } from '../../types';
import { RouteAnimation } from './RouteAnimation';
import { PhotoMarkers, Photo } from './PhotoMarkers';

interface TripMapProps extends MapProps {
  activityStreams: Record<number, ActivityStreams>;
  highlightedActivityId?: number | null;
  animationState?: {
    isPlaying: boolean;
    speed: number;
    activityId: number | null;
  };
  onAnimationComplete?: () => void;
  photos?: Photo[];
}

export const TripMap: React.FC<TripMapProps> = ({ 
  activityStreams, 
  highlightedActivityId,
  animationState,
  onAnimationComplete,
  photos = [],
  ...mapProps 
}) => {
  const [animationPos, setAnimationPos] = useState<{ lat: number; lng: number } | null>(null);

  const animationPath = useMemo(() => {
    if (!animationState?.activityId) return null;
    const streams = activityStreams[animationState.activityId];
    if (!streams || !streams.latlng || streams.latlng.length === 0) return null;
    return streams.latlng.map(([lat, lng]) => ({ lat, lng }));
  }, [animationState?.activityId, activityStreams]);

  return (
    <Map
      {...mapProps}
      mapId={import.meta.env.VITE_GOOGLE_MAPS_ID || 'DEMO_MAP_ID'}
      style={{ width: '100%', height: '100%' }}
      defaultCenter={{ lat: 0, lng: 0 }}
      defaultZoom={2}
      mapTypeId="hybrid"
      gestureHandling="greedy"
      disableDefaultUI={false}
    >
      <RoutePolylines 
        activityStreams={activityStreams} 
        highlightedActivityId={highlightedActivityId} 
      />
      <MapAutoZoom 
        activityStreams={activityStreams} 
        highlightedActivityId={highlightedActivityId} 
        isAnimationPlaying={animationState?.isPlaying}
      />
      
      <PhotoMarkers photos={photos} />

      {animationPath && animationState && animationState.activityId !== null && (
        <>
          <RouteAnimation
            activityId={animationState.activityId}
            path={animationPath}
            isPlaying={animationState.isPlaying}
            speed={animationState.speed}
            onComplete={() => onAnimationComplete?.()}
            onPositionChange={setAnimationPos}
          />
          {animationPos && (
            <Marker 
              position={animationPos}
              zIndex={1000}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#FFFFFF',
                fillOpacity: 1,
                strokeColor: '#3b82f6',
                strokeWeight: 4,
              }}
            />
          )}
        </>
      )}
    </Map>
  );
};

const RoutePolylines: React.FC<{ 
  activityStreams: Record<number, ActivityStreams>;
  highlightedActivityId?: number | null;
}> = ({ activityStreams, highlightedActivityId }) => {
  const map = useMap();
  
  const colors = useMemo(() => [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
  ], []);

  const polylines = useMemo(() => {
    return Object.entries(activityStreams).map(([idStr, streams], index) => {
      const id = parseInt(idStr);
      if (!streams.latlng || streams.latlng.length === 0) return null;
      
      const path = streams.latlng.map(([lat, lng]) => ({ lat, lng }));
      
      const isHighlighted = highlightedActivityId === null || highlightedActivityId === id;

      return {
        id,
        polyline: new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: colors[index % colors.length],
          strokeOpacity: isHighlighted ? 0.9 : 0.3,
          strokeWeight: isHighlighted ? 5 : 3,
          zIndex: isHighlighted ? 100 : 10,
        })
      };
    });
  }, [activityStreams, highlightedActivityId, colors]);

  useEffect(() => {
    if (!map) return;
    
    polylines.forEach(item => {
      if (item) item.polyline.setMap(map);
    });

    return () => {
      polylines.forEach(item => {
        if (item) item.polyline.setMap(null);
      });
    };
  }, [map, polylines]);

  return null;
};

const MapAutoZoom: React.FC<{ 
  activityStreams: Record<number, ActivityStreams>;
  highlightedActivityId?: number | null;
  isAnimationPlaying?: boolean;
}> = ({ activityStreams, highlightedActivityId, isAnimationPlaying }) => {
  const map = useMap();

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!map || isAnimationPlaying) return;
    
    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    Object.entries(activityStreams).forEach(([idStr, streams]) => {
      const id = parseInt(idStr);
      // If an activity is highlighted, only zoom to that one.
      // If null is highlighted (show all), zoom to all.
      // Special case: on first load, we want to zoom to ALL activities if it's a multi-day trip
      if (!isFirstLoad.current && highlightedActivityId !== null && highlightedActivityId !== id) return;

      if (streams.latlng && streams.latlng.length > 0) {
        streams.latlng.forEach(([lat, lng]) => {
          bounds.extend({ lat, lng });
          hasCoords = true;
        });
      }
    });

    if (hasCoords) {
      map.fitBounds(bounds, {
        top: 100,
        right: 100,
        bottom: 100,
        left: 100
      });
      isFirstLoad.current = false;
    }
  }, [map, activityStreams, highlightedActivityId, isAnimationPlaying]);

  return null;
};
