import { describe, it, expect } from 'vitest';
import { calculateRangeFromBounds } from '../../../utils/mapUtils';

// Helper to create a mock LatLngBounds-compatible object
// In tests, google.maps is not available, so calculateRangeFromBounds
// falls back to equirectangular approximation using .lat() and .lng() methods.
function makeMockBounds(
  neLat: number,
  neLng: number,
  swLat: number,
  swLng: number,
): google.maps.LatLngBounds {
  return {
    getNorthEast: () => ({ lat: () => neLat, lng: () => neLng }) as google.maps.LatLng,
    getSouthWest: () => ({ lat: () => swLat, lng: () => swLng }) as google.maps.LatLng,
  } as unknown as google.maps.LatLngBounds;
}

describe('calculateRangeFromBounds', () => {
  it('returns a positive range for a small bounding box (city-scale)', () => {
    // ~10km x 10km area
    const bounds = makeMockBounds(37.8, -122.3, 37.7, -122.4);
    const range = calculateRangeFromBounds(bounds);
    // Diagonal ~14km, * 1.3 = ~18.2km, but minimum is 1000m
    expect(range).toBeGreaterThan(1000);
    expect(range).toBeLessThan(50000);
  });

  it('returns a larger range for a large bounding box (multi-day trip scale)', () => {
    // ~100km x 100km area
    const bounds = makeMockBounds(38.5, -121.5, 37.5, -122.5);
    const range = calculateRangeFromBounds(bounds);
    // Diagonal ~141km, * 1.3 = ~183km
    expect(range).toBeGreaterThan(50000);
    expect(range).toBeLessThan(500000);
  });

  it('returns minimum 1000m range for a zero-area bounds (single point)', () => {
    const bounds = makeMockBounds(37.7, -122.4, 37.7, -122.4);
    const range = calculateRangeFromBounds(bounds);
    expect(range).toBe(1000);
  });

  it('returns range proportional to bounds size', () => {
    // Small bounds
    const smallBounds = makeMockBounds(37.71, -122.39, 37.70, -122.40);
    const smallRange = calculateRangeFromBounds(smallBounds);

    // 10x larger bounds
    const largeBounds = makeMockBounds(37.80, -122.30, 37.70, -122.40);
    const largeRange = calculateRangeFromBounds(largeBounds);

    expect(largeRange).toBeGreaterThan(smallRange);
  });
});
