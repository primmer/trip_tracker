import { describe, it, expect } from 'vitest';
import { calculateCameraFromBounds } from '../../../utils/mapUtils';

function makeMockBounds(
  neLat: number,
  neLng: number,
  swLat: number,
  swLng: number,
): google.maps.LatLngBounds {
  return {
    getNorthEast: () => ({ lat: () => neLat, lng: () => neLng }) as google.maps.LatLng,
    getSouthWest: () => ({ lat: () => swLat, lng: () => swLng }) as google.maps.LatLng,
    getCenter: () =>
      ({
        lat: () => (neLat + swLat) / 2,
        lng: () => (neLng + swLng) / 2,
      }) as google.maps.LatLng,
  } as unknown as google.maps.LatLngBounds;
}

describe('calculateCameraFromBounds', () => {
  it('returns a positive range for a small bounding box', () => {
    const bounds = makeMockBounds(37.8, -122.3, 37.7, -122.4);
    const { range } = calculateCameraFromBounds(bounds);
    expect(range).toBeGreaterThan(1000);
    expect(range).toBeLessThan(50000);
  });

  it('returns a larger range for a large bounding box', () => {
    const bounds = makeMockBounds(38.5, -121.5, 37.5, -122.5);
    const { range } = calculateCameraFromBounds(bounds);
    expect(range).toBeGreaterThan(50000);
    expect(range).toBeLessThan(500000);
  });

  it('returns minimum 1000m range for a single point', () => {
    const bounds = makeMockBounds(37.7, -122.4, 37.7, -122.4);
    const { range } = calculateCameraFromBounds(bounds);
    expect(range).toBe(1000);
  });

  it('shifts center south to move route up in viewport', () => {
    const bounds = makeMockBounds(37.8, -122.3, 37.7, -122.4);
    const { center } = calculateCameraFromBounds(bounds);
    const geoCenter = (37.8 + 37.7) / 2;
    // Center shifted SOUTH ~12% to move route UP in viewport
    // (shifting center down moves the viewport up, pushing route higher)
    expect(center.lat).toBeLessThan(geoCenter);
    expect(center.lat).toBeGreaterThan(geoCenter - 0.015); // shifted by ~0.012
  });

  it('returns range proportional to bounds size', () => {
    const small = makeMockBounds(37.71, -122.39, 37.7, -122.4);
    const large = makeMockBounds(37.8, -122.3, 37.7, -122.4);
    expect(calculateCameraFromBounds(large).range).toBeGreaterThan(
      calculateCameraFromBounds(small).range,
    );
  });
});
