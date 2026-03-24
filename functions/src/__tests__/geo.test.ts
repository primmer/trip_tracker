import { describe, it, expect } from 'vitest';
import { findNearestLatLng, sampleRoutePoints } from '../utils/geo.js';

describe('findNearestLatLng', () => {
  const activityStartDate = '2026-03-15T10:00:00Z'; // 1742032800000
  const streams = {
    latlng: [
      [37.7749, -122.4194],
      [37.7750, -122.4195],
      [37.7751, -122.4196],
    ] as [number, number][],
    time: [0, 60, 120], // 0s, 1min, 2min
    altitude: [10, 11, 12],
    distance: [0, 100, 200],
  };

  it('finds exact match', () => {
    const photoTime = '2026-03-15T10:01:00Z'; // +60s
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toEqual({ lat: 37.7750, lng: -122.4195 });
  });

  it('finds nearest match', () => {
    const photoTime = '2026-03-15T10:01:10Z'; // +70s, nearer to 60s
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toEqual({ lat: 37.7750, lng: -122.4195 });
  });

  it('handles timestamp just before activity within buffer', () => {
    const photoTime = '2026-03-15T09:55:00Z'; // -5min
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('handles timestamp just after activity within buffer', () => {
    const photoTime = '2026-03-15T10:05:00Z'; // +3min (activity ends at 10:02:00)
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toEqual({ lat: 37.7751, lng: -122.4196 });
  });

  it('returns null for timestamp far before activity', () => {
    const photoTime = '2026-03-15T09:40:00Z'; // -20min
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toBeNull();
  });

  it('returns null for timestamp far after activity', () => {
    const photoTime = '2026-03-15T10:30:00Z'; // +30min
    const result = findNearestLatLng(photoTime, activityStartDate, streams);
    expect(result).toBeNull();
  });
});

describe('sampleRoutePoints', () => {
  it('samples 3 points: start, midpoint, and end', () => {
    const streams = {
      latlng: [
        [37.7749, -122.4194],
        [37.7750, -122.4195],
        [37.7751, -122.4196],
        [37.7752, -122.4197],
        [37.7753, -122.4198],
      ] as [number, number][],
      time: [0, 60, 120, 180, 240],
      altitude: [10, 11, 12, 13, 14],
      distance: [0, 100, 200, 300, 400],
    };

    const result = sampleRoutePoints(streams);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lat: 37.7749, lng: -122.4194 }); // start
    expect(result[1]).toEqual({ lat: 37.7751, lng: -122.4196 }); // midpoint (highestIdx became midpoint because 4 is not < 5-1)
    expect(result[2]).toEqual({ lat: 37.7753, lng: -122.4198 }); // end
  });

  it('samples highest elevation point correctly', () => {
    const streams = {
      latlng: [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ] as [number, number][],
      time: [0, 1, 2, 3, 4],
      altitude: [10, 100, 50, 20, 10], // highest is index 1
      distance: [0, 1, 2, 3, 4],
    };

    const result = sampleRoutePoints(streams);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lat: 0, lng: 0 }); // start
    expect(result[1]).toEqual({ lat: 1, lng: 1 }); // highest
    expect(result[2]).toEqual({ lat: 4, lng: 4 }); // end
  });

  it('handles small routes', () => {
    const streams = {
      latlng: [
        [0, 0],
        [1, 1],
      ] as [number, number][],
      time: [0, 1],
      altitude: [10, 20],
      distance: [0, 1],
    };

    const result = sampleRoutePoints(streams);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ lat: 0, lng: 0 });
    expect(result[1]).toEqual({ lat: 1, lng: 1 });
  });

  it('handles single point routes', () => {
    const streams = {
      latlng: [
        [0, 0],
      ] as [number, number][],
      time: [0],
      altitude: [10],
      distance: [0],
    };

    const result = sampleRoutePoints(streams);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ lat: 0, lng: 0 });
  });
});
