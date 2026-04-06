import { describe, it, expect } from 'vitest';
import { processElevationData } from '../elevation';

describe('elevation data processing', () => {
  it('processes basic elevation and distance data', () => {
    const distance = [0, 100, 200, 300];
    const altitude = [10, 15, 20, 18];

    const result = processElevationData(distance, altitude);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ x: 0, y: 10 });
    expect(result[1]).toEqual({ x: 100, y: 15 });
    expect(result[2]).toEqual({ x: 200, y: 20 });
    expect(result[3]).toEqual({ x: 300, y: 18 });
  });

  it('downsamples large datasets', () => {
    const distance = Array.from({ length: 1000 }, (_, i) => i * 10);
    const altitude = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10) * 100 + 500);

    const result = processElevationData(distance, altitude, 100);

    expect(result.length).toBeLessThanOrEqual(100);
    expect(result[0].x).toBe(0);
    expect(result[result.length - 1].x).toBe(9990);
  });

  it('handles empty data', () => {
    expect(processElevationData([], [])).toEqual([]);
  });
});
