import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map3D,
  useMap3D,
  AltitudeMode,
  MapMode,
  Marker3D,
  useApiIsLoaded,
} from '@vis.gl/react-google-maps';
import { Activity, ActivityStreams } from '../../types';
import { RouteAnimation } from './RouteAnimation';
import { PhotoMarkers, Photo } from './PhotoMarkers';
import { ROUTE_COLORS } from './routeColors';
import { calculateCameraFromBounds } from '../../utils/mapUtils';

// Local type extensions for APIs available at runtime but not yet in @types/google.maps 3.58.1
interface Map3DElementWithFly extends google.maps.maps3d.Map3DElement {
  flyCameraTo(options: {
    endCamera: {
      center: google.maps.LatLngAltitudeLiteral;
      range: number;
      tilt: number;
      heading: number;
    };
    durationMillis: number;
  }): void;
}

interface Polyline3DElementWithPath extends google.maps.maps3d.Polyline3DElement {
  path: google.maps.LatLngAltitudeLiteral[];
}

interface TripMapProps {
  activityStreams: Record<number, ActivityStreams>;
  activities?: Activity[];
  highlightedActivityId?: number | null;
  animationState?: {
    isPlaying: boolean;
    speed: number;
    activityId: number | null;
  };
  onAnimationComplete?: () => void;
  photos?: Photo[];
  scrubPosition?: { lat: number; lng: number } | null;
  onPhotoSelect?: (photo: Photo) => void;
}

export const TripMap: React.FC<TripMapProps> = ({
  activityStreams,
  activities,
  highlightedActivityId,
  animationState,
  onAnimationComplete,
  photos = [],
  scrubPosition,
  onPhotoSelect,
}) => {
  const [animationPos, setAnimationPos] = useState<{ lat: number; lng: number } | null>(null);
  const apiIsLoaded = useApiIsLoaded();
  const map3d = useMap3D();

  const animationPath = useMemo(() => {
    if (!animationState?.activityId) return null;
    const streams = activityStreams[animationState.activityId];
    if (!streams || !streams.latlng || streams.latlng.length === 0) return null;
    return streams.latlng.map(([lat, lng]) => ({ lat, lng }));
  }, [animationState?.activityId, activityStreams]);

  return (
    <Map3D
      mode={MapMode.HYBRID}
      style={{ width: '100%', height: '100%' }}
      defaultCenter={{ lat: 37.5, lng: -122.0, altitude: 0 }}
      defaultRange={2000000}
      defaultTilt={0}
      defaultHeading={0}
      // @ts-expect-error - defaultUIHidden is a valid runtime prop but not in types yet
      defaultUIHidden={true}
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

      <PhotoMarkers photos={photos} activities={activities} onPhotoSelect={onPhotoSelect} />

      {animationPath && animationState && animationState.activityId !== null && (
        <RouteAnimation
          activityId={animationState.activityId}
          path={animationPath}
          isPlaying={animationState.isPlaying}
          speed={animationState.speed}
          onComplete={() => onAnimationComplete?.()}
          onPositionChange={setAnimationPos}
        />
      )}

      {animationPos && (
        <Marker3D
          position={{ lat: animationPos.lat, lng: animationPos.lng, altitude: 0 }}
          altitudeMode={AltitudeMode.CLAMP_TO_GROUND}
          zIndex={1000}
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="5" fill="#FFFFFF" stroke="#3b82f6" strokeWidth="3" />
          </svg>
        </Marker3D>
      )}

      {scrubPosition && (
        <Marker3D
          position={{ lat: scrubPosition.lat, lng: scrubPosition.lng, altitude: 0 }}
          altitudeMode={AltitudeMode.CLAMP_TO_GROUND}
          zIndex={999}
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="5" fill="#FFFFFF" stroke="#3b82f6" strokeWidth="3" />
          </svg>
        </Marker3D>
      )}
    </Map3D>
  );
};

// ---------------------------------------------------------------------------
// RoutePolylines — renders route polylines using the imperative Map3D API.
// Uses gmp-polyline-3d custom elements with CLAMP_TO_GROUND altitude mode so
// polylines follow terrain surface rather than floating or clipping through hills.
// ---------------------------------------------------------------------------

const RoutePolylines: React.FC<{
  activityStreams: Record<number, ActivityStreams>;
  highlightedActivityId?: number | null;
}> = ({ activityStreams, highlightedActivityId }) => {
  const map3d = useMap3D();

  useEffect(() => {
    if (!map3d) return;

    const polylines: Element[] = [];

    Object.entries(activityStreams).forEach(([idStr, streams], index) => {
      const id = parseInt(idStr);
      if (!streams.latlng || streams.latlng.length === 0) return;

      const isHighlighted = highlightedActivityId === null || highlightedActivityId === id;
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

      const polyline = document.createElement(
        'gmp-polyline-3d',
      ) as google.maps.maps3d.Polyline3DElement;

      polyline.altitudeMode = google.maps.maps3d.AltitudeMode.CLAMP_TO_GROUND;
      (polyline as Polyline3DElementWithPath).path = streams.latlng.map(([lat, lng]) => ({
        lat,
        lng,
        altitude: 0,
      }));
      polyline.strokeColor = color;
      polyline.strokeOpacity = isHighlighted ? 0.9 : 0.3;
      polyline.strokeWidth = isHighlighted ? 5 : 3;
      polyline.zIndex = isHighlighted ? 100 : 10;

      map3d.append(polyline);
      polylines.push(polyline);
    });

    return () => {
      polylines.forEach((p) => p.remove());
    };
  }, [map3d, activityStreams, highlightedActivityId]);

  return null;
};

// ---------------------------------------------------------------------------
// MapAutoZoom — renderless component that fits the camera to the active routes.
// Replaces map.fitBounds() (not available on Map3D) with a range-based approach
// using calculateRangeFromBounds. Uses flyCameraTo for smooth animated transitions.
// ---------------------------------------------------------------------------

const MapAutoZoom: React.FC<{
  activityStreams: Record<number, ActivityStreams>;
  highlightedActivityId?: number | null;
  isAnimationPlaying?: boolean;
}> = ({ activityStreams, highlightedActivityId, isAnimationPlaying }) => {
  const map3d = useMap3D();
  const apiIsLoaded = useApiIsLoaded();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!map3d || !apiIsLoaded || isAnimationPlaying) return;

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    Object.entries(activityStreams).forEach(([idStr, streams]) => {
      const id = parseInt(idStr);
      // On subsequent selections: only zoom to the highlighted activity.
      // On first load (isFirstLoad.current === true): zoom to all activities.
      if (!isFirstLoad.current && highlightedActivityId !== null && highlightedActivityId !== id)
        return;

      if (streams.latlng && streams.latlng.length > 0) {
        streams.latlng.forEach(([lat, lng]) => {
          bounds.extend({ lat, lng });
          hasCoords = true;
        });
      }
    });

    if (hasCoords) {
      const { center, range } = calculateCameraFromBounds(bounds);

      const map3dWithFly = map3d as unknown as Map3DElementWithFly;
      map3dWithFly.flyCameraTo({
        endCamera: {
          center: { lat: center.lat, lng: center.lng, altitude: 0 },
          range,
          tilt: 0,
          heading: 0,
        },
        durationMillis: isFirstLoad.current ? 500 : 1000,
      });
      isFirstLoad.current = false;
    }
  }, [map3d, apiIsLoaded, activityStreams, highlightedActivityId, isAnimationPlaying]);

  return null;
};
