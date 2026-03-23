import React, { useMemo } from 'react';
import { processElevationData } from '../utils/elevation';
import { metersToFeet, metersToMiles, metersToKm } from '../utils/units';

interface ElevationChartProps {
  distance: number[];
  altitude: number[];
  height?: number;
  width?: number | string;
  className?: string;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  distance,
  altitude,
  height = 120,
  width = '100%',
  className = ''
}) => {
  const data = useMemo(() => processElevationData(distance, altitude), [distance, altitude]);

  if (data.length < 2) {
    return null;
  }

  const minX = data[0].x;
  const maxX = data[data.length - 1].x;
  const minY = Math.min(...data.map(p => p.y));
  const maxY = Math.max(...data.map(p => p.y));

  // Add some padding to Y axis
  const yPadding = (maxY - minY) * 0.1 || 10;
  const chartMinY = minY - yPadding;
  const chartMaxY = maxY + yPadding;

  const getX = (x: number) => {
    const range = maxX - minX;
    if (range <= 0) return 0;
    return ((x - minX) / range) * 100;
  };
  
  const getY = (y: number) => {
    const range = chartMaxY - chartMinY;
    if (range <= 0) return 50;
    return 100 - ((y - chartMinY) / range) * 100;
  };

  const points = data.map(p => `${getX(p.x)},${getY(p.y)}`).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className={`relative ${className}`} style={{ height, width }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Fill Area */}
        <polyline
          points={areaPoints}
          fill="url(#elevationGradient)"
          stroke="none"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="elevationGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Y-Axis Label */}
      <div className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-[8px] font-medium text-gray-400 pointer-events-none">
        Elevation (ft / m)
      </div>

      {/* X-Axis Label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-medium text-gray-400 pointer-events-none">
        Distance (mi / km)
      </div>

      {/* Axes / Labels */}
      <div className="absolute top-0 left-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
        {Math.round(metersToFeet(maxY)).toLocaleString()} ft / {Math.round(maxY).toLocaleString()} m
      </div>
      <div className="absolute bottom-0 left-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
        {Math.round(metersToFeet(minY)).toLocaleString()} ft / {Math.round(minY).toLocaleString()} m
      </div>
      <div className="absolute bottom-0 right-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
        {metersToMiles(maxX).toFixed(1)} mi / {metersToKm(maxX).toFixed(1)} km
      </div>
    </div>
  );
};
