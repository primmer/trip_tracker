import React, { useMemo, useRef, useCallback, useState } from 'react';
import { processElevationData } from '../utils/elevation';
import { metersToFeet, metersToMiles, metersToKm } from '../utils/units';

export interface ElevationScrubData {
  distance: number;
  altitude: number;
  grade: number;
  fraction: number;
}

interface ElevationChartProps {
  distance: number[];
  altitude: number[];
  height?: number;
  width?: number | string;
  className?: string;
  showLabels?: boolean;
  variant?: 'default' | 'overlay' | 'interactive';
  id?: string;
  onScrub?: (data: ElevationScrubData | null) => void;
  scrubFraction?: number | null;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  distance,
  altitude,
  height = 120,
  width = '100%',
  className = '',
  showLabels = true,
  variant = 'default',
  id = 'elevation',
  onScrub,
  scrubFraction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localFraction, setLocalFraction] = useState<number | null>(null);
  const data = useMemo(() => processElevationData(distance, altitude), [distance, altitude]);

  const fraction = scrubFraction ?? localFraction;
  const isInteractive = variant === 'interactive';

  const getDataAtFraction = useCallback(
    (f: number): ElevationScrubData | null => {
      if (data.length < 2 || f < 0 || f > 1) return null;
      const minX = data[0].x;
      const maxX = data[data.length - 1].x;
      const targetX = minX + f * (maxX - minX);

      let idx = 0;
      for (let i = 1; i < data.length; i++) {
        if (data[i].x >= targetX) {
          idx = i;
          break;
        }
        idx = i;
      }
      const prev = data[Math.max(0, idx - 1)];
      const curr = data[idx];
      const t = curr.x === prev.x ? 0 : (targetX - prev.x) / (curr.x - prev.x);
      const alt = prev.y + t * (curr.y - prev.y);

      let grade = 0;
      if (idx > 0) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        if (dx > 0) grade = (dy / dx) * 100;
      }

      return { distance: targetX, altitude: alt, grade, fraction: f };
    },
    [data],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current || !isInteractive) return;
      const rect = containerRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setLocalFraction(f);
      onScrub?.(getDataAtFraction(f));
    },
    [isInteractive, onScrub, getDataAtFraction],
  );

  const handlePointerLeave = useCallback(() => {
    if (!isInteractive) return;
    setLocalFraction(null);
    onScrub?.(null);
  }, [isInteractive, onScrub]);

  if (data.length < 2) {
    return null;
  }

  const minX = data[0].x;
  const maxX = data[data.length - 1].x;
  const minY = Math.min(...data.map((p) => p.y));
  const maxY = Math.max(...data.map((p) => p.y));

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

  const points = data.map((p) => `${getX(p.x)},${getY(p.y)}`).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;
  const gradId = `${id}-grad`;
  const isOverlay = variant === 'overlay';

  const scrubData =
    fraction !== null && fraction !== undefined ? getDataAtFraction(fraction) : null;
  const scrubXPct = fraction !== null && fraction !== undefined ? fraction * 100 : null;
  const scrubYPct = scrubData ? getY(scrubData.altitude) : null;

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${isInteractive ? 'cursor-crosshair' : ''}`}
      style={{ height, width, touchAction: isInteractive ? 'none' : 'auto' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          {!isOverlay && (
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={isInteractive ? '#ffffff' : '#3b82f6'}
                stopOpacity={isInteractive ? 0.15 : 0.3}
              />
              <stop
                offset="100%"
                stopColor={isInteractive ? '#ffffff' : '#3b82f6'}
                stopOpacity={0.05}
              />
            </linearGradient>
          )}
        </defs>
        {!isOverlay && <polyline points={areaPoints} fill={`url(#${gradId})`} stroke="none" />}
        <polyline
          points={points}
          fill="none"
          stroke={isOverlay || isInteractive ? 'rgba(255,255,255,0.5)' : '#3b82f6'}
          strokeWidth={isOverlay || isInteractive ? '1.5' : '1'}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect={isOverlay || isInteractive ? 'non-scaling-stroke' : undefined}
        />
        {/* Scrub cursor line */}
        {isInteractive && scrubXPct !== null && (
          <line
            x1={scrubXPct}
            y1={0}
            x2={scrubXPct}
            y2={100}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Scrub dot (rendered in pixel space for consistent size) */}
      {isInteractive && scrubXPct !== null && scrubYPct !== null && (
        <div
          className="absolute w-3 h-3 rounded-full bg-white border-2 border-white/70 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${scrubXPct}%`, top: `${scrubYPct}%` }}
        />
      )}

      {/* Scrub tooltip */}
      {isInteractive && scrubData && scrubXPct !== null && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${Math.max(10, Math.min(90, scrubXPct))}%` }}
        >
          <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 shadow-xl">
            <span className="text-white font-bold">
              {metersToMiles(scrubData.distance).toFixed(1)} mi
            </span>
            <span className="text-gray-500 mx-1.5">|</span>
            <span className="font-bold">
              {Math.round(metersToFeet(scrubData.altitude)).toLocaleString()} ft
            </span>
            <span className="text-gray-500 mx-1.5">|</span>
            <span className={scrubData.grade > 0 ? 'text-red-400' : 'text-green-400'}>
              {scrubData.grade.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {showLabels && !isInteractive && (
        <>
          <div className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-[8px] font-medium text-gray-400 pointer-events-none">
            Elevation (ft / m)
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-medium text-gray-400 pointer-events-none">
            Distance (mi / km)
          </div>
          <div className="absolute top-0 left-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
            {Math.round(metersToFeet(maxY)).toLocaleString()} ft /{' '}
            {Math.round(maxY).toLocaleString()} m
          </div>
          <div className="absolute bottom-0 left-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
            {Math.round(metersToFeet(minY)).toLocaleString()} ft /{' '}
            {Math.round(minY).toLocaleString()} m
          </div>
          <div className="absolute bottom-0 right-0 text-[9px] font-bold text-gray-500 bg-white/50 px-1 rounded pointer-events-none">
            {metersToMiles(maxX).toFixed(1)} mi / {metersToKm(maxX).toFixed(1)} km
          </div>
        </>
      )}
    </div>
  );
};
