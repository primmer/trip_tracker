import { describe, it, expect } from 'vitest';
import { extractHashtags, groupActivitiesIntoTrips, shouldExcludeFromSync, } from '../utils/trips.js';
describe('extractHashtags', () => {
    it('extracts single hashtag', () => {
        expect(extractHashtags('#otb something')).toEqual(['otb']);
    });
    it('extracts multiple hashtags', () => {
        expect(extractHashtags('#trip1 text #trip2')).toEqual(['trip1', 'trip2']);
    });
    it('returns empty for no hashtags', () => {
        expect(extractHashtags('no tags here')).toEqual([]);
    });
    it('handles null/undefined description', () => {
        expect(extractHashtags(null)).toEqual([]);
        expect(extractHashtags(undefined)).toEqual([]);
    });
});
describe('groupActivitiesIntoTrips', () => {
    const activity1 = {
        id: 1,
        name: 'Ride 1',
        start_date: '2026-03-15T10:00:00Z',
        distance: 10,
        total_elevation_gain: 100,
        elapsed_time: 3600,
        description: '#otb example',
        map: { summary_polyline: '' },
        start_latlng: [0, 0],
        end_latlng: [0, 0],
    };
    const activity2 = {
        id: 2,
        name: 'Ride 2',
        start_date: '2026-07-04T10:00:00Z',
        distance: 20,
        total_elevation_gain: 200,
        elapsed_time: 7200,
        description: 'Day 1 #hmb_jul4',
        map: { summary_polyline: '' },
        start_latlng: [0, 0],
        end_latlng: [0, 0],
    };
    const activity3 = {
        id: 3,
        name: 'Ride 3',
        start_date: '2026-07-05T10:00:00Z',
        distance: 15,
        total_elevation_gain: 150,
        elapsed_time: 5400,
        description: 'Day 2 #hmb_jul4',
        map: { summary_polyline: '' },
        start_latlng: [0, 0],
        end_latlng: [0, 0],
    };
    const activityNoTag = {
        id: 4,
        name: 'Ride No Tag',
        start_date: '2026-01-01T10:00:00Z',
        distance: 5,
        total_elevation_gain: 50,
        elapsed_time: 1800,
        description: 'Just a ride',
        map: { summary_polyline: '' },
        start_latlng: [0, 0],
        end_latlng: [0, 0],
    };
    it('groups activities by hashtag and collects polylines', () => {
        const activityWithPoly1 = { ...activity2, map: { summary_polyline: 'poly1' } };
        const activityWithPoly2 = { ...activity3, map: { summary_polyline: 'poly2' } };
        const activities = [activityWithPoly1, activityWithPoly2];
        const trips = groupActivitiesIntoTrips(activities);
        expect(trips).toHaveLength(1);
        const hmbTrip = trips[0];
        expect(hmbTrip.summaryPolylines).toEqual(['poly1', 'poly2']);
    });
    it('handles untagged activities as individual trips', () => {
        const activities = [activity1, activityNoTag];
        const trips = groupActivitiesIntoTrips(activities);
        expect(trips).toHaveLength(2);
        expect(trips.find((t) => t.hashtag === null)).toBeDefined();
        expect(trips.find((t) => t.hashtag === 'otb')).toBeDefined();
    });
});
describe('shouldExcludeFromSync', () => {
    it('returns true for #no_triptracker_sync hashtag', () => {
        expect(shouldExcludeFromSync('Ride with #no_triptracker_sync tag')).toBe(true);
    });
    it('returns true for lowercase variation', () => {
        expect(shouldExcludeFromSync('Ride with #NO_TRIPTRACKER_SYNC tag')).toBe(true);
        expect(shouldExcludeFromSync('Ride with #No_TripTracker_Sync tag')).toBe(true);
    });
    it('returns false when no exclusion hashtag present', () => {
        expect(shouldExcludeFromSync('Regular ride description')).toBe(false);
        expect(shouldExcludeFromSync('Ride with #otb hashtag')).toBe(false);
    });
    it('returns false for null or undefined', () => {
        expect(shouldExcludeFromSync(null)).toBe(false);
        expect(shouldExcludeFromSync(undefined)).toBe(false);
    });
    it('returns false for similar but different hashtags', () => {
        expect(shouldExcludeFromSync('Ride with #no_sync tag')).toBe(false);
        expect(shouldExcludeFromSync('Ride with #nosync tag')).toBe(false);
    });
});
//# sourceMappingURL=trips.test.js.map