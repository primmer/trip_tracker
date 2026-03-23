import { describe, it, expect } from 'vitest';
import { extractHashtags, groupActivitiesIntoTrips } from '../utils/trips.js';
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
    it('groups activities by hashtag', () => {
        const activities = [activity1, activity2, activity3];
        const trips = groupActivitiesIntoTrips(activities);
        expect(trips).toHaveLength(2);
        const hmbTrip = trips.find(t => t.id === 'hmb_jul4');
        expect(hmbTrip).toBeDefined();
        expect(hmbTrip?.activityIds).toHaveLength(2);
        expect(hmbTrip?.dateRange.start).toBe(activity2.start_date);
        expect(hmbTrip?.dateRange.end).toBe(activity3.start_date);
        const otbTrip = trips.find(t => t.id === 'otb');
        expect(otbTrip).toBeDefined();
        expect(otbTrip?.activityIds).toHaveLength(1);
        expect(otbTrip?.dateRange.start).toBe(activity1.start_date);
        expect(otbTrip?.dateRange.end).toBe(activity1.start_date);
    });
    it('handles untagged activities as individual trips', () => {
        const activities = [activity1, activityNoTag];
        const trips = groupActivitiesIntoTrips(activities);
        expect(trips).toHaveLength(2);
        expect(trips.find(t => t.hashtag === null)).toBeDefined();
        expect(trips.find(t => t.hashtag === 'otb')).toBeDefined();
    });
});
//# sourceMappingURL=trips.test.js.map