import React, { useEffect, useRef } from 'react';

interface StaticMapProps {
  polylines: string[];
  className?: string;
  strokeColor?: string;
  strokeWeight?: number;
  padding?: number;
}

export const StaticMap: React.FC<StaticMapProps> = ({
  polylines,
  className = '',
  strokeColor = '#3b82f6',
  strokeWeight = 2,
  padding = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || polylines.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Decode polylines to get all points
    const allPoints: { lat: number; lng: number }[] = [];
    polylines.forEach(polyline => {
      const points = decodePolyline(polyline);
      allPoints.push(...points);
    });

    if (allPoints.length === 0) return;

    // Calculate bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    allPoints.forEach(p => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    });

    // Handle single point case
    if (minLat === maxLat) { minLat -= 0.01; maxLat += 0.01; }
    if (minLng === maxLng) { minLng -= 0.01; maxLng += 0.01; }

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;

    // Drawing function
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Add padding
      const usableWidth = width - padding * 2;
      const usableHeight = height - padding * 2;

      // Maintain aspect ratio
      const scale = Math.min(usableWidth / lngRange, usableHeight / latRange);
      const xOffset = padding + (usableWidth - lngRange * scale) / 2;
      const yOffset = padding + (usableHeight - latRange * scale) / 2;

      const project = (lat: number, lng: number) => ({
        x: xOffset + (lng - minLng) * scale,
        y: height - (yOffset + (lat - minLat) * scale) // Flip Y for canvas
      });

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWeight;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      polylines.forEach(polyline => {
        const points = decodePolyline(polyline);
        if (points.length < 2) return;

        ctx.beginPath();
        const start = project(points[0].lat, points[0].lng);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < points.length; i++) {
          const p = project(points[i].lat, points[i].lng);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    };

    // Responsive canvas
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [polylines, strokeColor, strokeWeight, padding]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${className}`}
    />
  );
};

// Simple polyline decoder
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
