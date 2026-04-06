import { describe, it, expect } from 'vitest';
import { findNearestLatLng } from '../utils/geo.js';
describe('findNearestLatLng', () => {
    const activityStartDate = '2026-03-15T10:00:00Z'; // 1742032800000
    const streams = {
        latlng: [
            [37.7749, -122.4194],
            [37.775, -122.4195],
            [37.7751, -122.4196],
        ],
        time: [0, 60, 120], // 0s, 1min, 2min
        altitude: [10, 11, 12],
        distance: [0, 100, 200],
    };
    it('finds exact match', () => {
        const photoTime = '2026-03-15T10:01:00Z'; // +60s
        const result = findNearestLatLng(photoTime, activityStartDate, streams);
        expect(result).toEqual({ lat: 37.775, lng: -122.4195 });
    });
    it('finds nearest match', () => {
        const photoTime = '2026-03-15T10:01:10Z'; // +70s, nearer to 60s
        const result = findNearestLatLng(photoTime, activityStartDate, streams);
        expect(result).toEqual({ lat: 37.775, lng: -122.4195 });
    });
    it('handles timestamp just before activity within buffer', () => {
        const photoTime = '2026-03-15T09:55:00Z'; // -5min
        const result = findNearestLatLng(photoTime, activityStartDate, streams);
        expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
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
//# sourceMappingURL=geo.test.js.map