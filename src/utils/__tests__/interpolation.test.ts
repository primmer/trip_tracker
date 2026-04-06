import { describe, it, expect } from 'vitest';
import { interpolatePoint, getPointAtDistance } from '../interpolation';

describe('interpolation utils', () => {
  it('interpolates midpoint correctly', () => {
    const p1 = { lat: 0, lng: 0 };
    const p2 = { lat: 10, lng: 10 };
    const mid = interpolatePoint(p1, p2, 0.5);
    expect(mid.lat).toBe(5);
    expect(mid.lng).toBe(5);
  });

  it('interpolates start point', () => {
    const p1 = { lat: 0, lng: 0 };
    const p2 = { lat: 10, lng: 10 };
    const start = interpolatePoint(p1, p2, 0);
    expect(start.lat).toBe(0);
    expect(start.lng).toBe(0);
  });

  it('interpolates end point', () => {
    const p1 = { lat: 0, lng: 0 };
    const p2 = { lat: 10, lng: 10 };
    const end = interpolatePoint(p1, p2, 1);
    expect(end.lat).toBe(10);
    expect(end.lng).toBe(10);
  });

  it('gets point at specific distance on simple path', () => {
    // Distance along path with two segments (0,0) -> (0,10) -> (0,20)
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 0, lng: 20 },
    ];

    // Distance 5 should be at (0, 5)
    const p5 = getPointAtDistance(path, 5);
    expect(p5.lat).toBe(0);
    expect(p5.lng).toBe(5);

    // Distance 15 should be at (0, 15)
    const p15 = getPointAtDistance(path, 15);
    expect(p15.lat).toBe(0);
    expect(p15.lng).toBe(15);
  });

  it('returns last point if distance exceeds path length', () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
    ];
    const pOver = getPointAtDistance(path, 100);
    expect(pOver.lat).toBe(0);
    expect(pOver.lng).toBe(10);
  });
});
