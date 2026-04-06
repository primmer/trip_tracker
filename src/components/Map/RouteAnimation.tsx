import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { getPointAtDistance, computePathLength } from '../../utils/interpolation';

export interface RouteAnimationProps {
  activityId: number;
  path: { lat: number; lng: number }[];
  isPlaying: boolean;
  speed: number; // Speed multiplier (1 = normal, 2 = fast)
  onComplete: () => void;
  onPositionChange?: (position: { lat: number; lng: number }) => void;
}

export const RouteAnimation: React.FC<RouteAnimationProps> = ({
  activityId,
  path,
  isPlaying,
  speed,
  onComplete,
  onPositionChange,
}) => {
  const map = useMap();
  const [currentDistance, setCurrentDistance] = useState(0);
  const lastTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  const totalLength = useMemo(() => computePathLength(path), [path]);

  // Base speed in meters per second (approx 20km/h = 5.5m/s, but we want it faster for animation)
  // Let's make it complete a 20km ride in about 20 seconds. 1000m/s.
  const BASE_SPEED = 500;

  useEffect(() => {
    setCurrentDistance(0);
    lastTimeRef.current = null;
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, [activityId]);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000; // in seconds
      lastTimeRef.current = time;

      const distanceDelta = BASE_SPEED * speed * deltaTime;

      setCurrentDistance((prev) => {
        const next = prev + distanceDelta;
        if (next >= totalLength) {
          onComplete();
          return 0; // Reset to 0 on completion
        }
        return next;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying && currentDistance < totalLength) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, totalLength, speed, onComplete, currentDistance]);

  useEffect(() => {
    if (!map || path.length === 0) return;

    const point = getPointAtDistance(path, currentDistance);
    map.panTo(point);

    if (onPositionChange) {
      onPositionChange(point);
    }
  }, [map, currentDistance, path, onPositionChange]);

  return null;
};
