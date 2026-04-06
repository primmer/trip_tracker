import React from 'react';
import { decodePolyline } from '../utils/polyline';

interface RouteOverlayProps {
  polylines: string[];
  className?: string;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  glowColor?: string;
  glowOpacity?: number;
  padding?: number;
}

const SVG_SIZE = 1000;

export const RouteOverlay: React.FC<RouteOverlayProps> = React.memo(
  ({
    polylines,
    className = '',
    strokeColor = '#ffffff',
    strokeOpacity = 0.6,
    strokeWidth = 2,
    glowColor,
    glowOpacity = 0.3,
    padding = 8,
  }) => {
    if (polylines.length === 0) return null;

    const allSegments = polylines.map((p) => decodePolyline(p));
    const allPoints = allSegments.flat();

    if (allPoints.length === 0) return null;

    let minLat = Infinity,
      maxLat = -Infinity;
    let minLng = Infinity,
      maxLng = -Infinity;

    for (const p of allPoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    if (minLat === maxLat) {
      minLat -= 0.01;
      maxLat += 0.01;
    }
    if (minLng === maxLng) {
      minLng -= 0.01;
      maxLng += 0.01;
    }

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;

    const pad = (SVG_SIZE * padding) / 100;
    const usable = SVG_SIZE - pad * 2;
    const scale = Math.min(usable / lngRange, usable / latRange);
    const xOffset = pad + (usable - lngRange * scale) / 2;
    const yOffset = pad + (usable - latRange * scale) / 2;

    const project = (lat: number, lng: number) => {
      const x = xOffset + (lng - minLng) * scale;
      const y = yOffset + (maxLat - lat) * scale;
      return { x, y };
    };

    const resolvedGlowColor = glowColor ?? strokeColor;

    const pathData = allSegments
      .map((segment) => {
        if (segment.length < 2) return '';
        const start = project(segment[0].lat, segment[0].lng);
        const parts = [`M${start.x.toFixed(2)},${start.y.toFixed(2)}`];
        for (let i = 1; i < segment.length; i++) {
          const p = project(segment[i].lat, segment[i].lng);
          parts.push(`L${p.x.toFixed(2)},${p.y.toFixed(2)}`);
        }
        return parts.join(' ');
      })
      .filter(Boolean)
      .join(' ');

    if (!pathData) return null;

    return (
      <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>
          <path
            d={pathData}
            fill="none"
            stroke={resolvedGlowColor}
            strokeOpacity={glowOpacity}
            strokeWidth={strokeWidth * 4}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#route-glow)"
          />
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeOpacity={strokeOpacity}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  },
);

RouteOverlay.displayName = 'RouteOverlay';
