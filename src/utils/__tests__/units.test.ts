import { describe, it, expect } from 'vitest';
import {
  metersToFeet,
  metersToMiles,
  metersToKm,
  secondsToDuration,
  formatTripName,
} from '../units';

describe('unit conversions', () => {
  it('converts meters to feet correctly', () => {
    // 1 m = 3.28084 ft
    expect(metersToFeet(1)).toBeCloseTo(3.281, 3);
    expect(metersToFeet(100)).toBeCloseTo(328.084, 1);
  });

  it('converts meters to miles correctly', () => {
    // 1 mile = 1609.34 meters
    expect(metersToMiles(1609.34)).toBeCloseTo(1, 2);
    expect(metersToMiles(1000)).toBeCloseTo(0.621, 3);
  });

  it('converts meters to kilometers correctly', () => {
    expect(metersToKm(1000)).toBe(1);
    expect(metersToKm(1500)).toBe(1.5);
  });

  it('formats seconds to duration string correctly', () => {
    expect(secondsToDuration(3600)).toBe('1h 0m');
    expect(secondsToDuration(3660)).toBe('1h 1m');
    expect(secondsToDuration(60)).toBe('0h 1m');
    expect(secondsToDuration(3725)).toBe('1h 2m');
  });
});

describe('formatTripName', () => {
  it('converts underscored hashtags to title case', () => {
    expect(formatTripName('pacifica_to_half_moon_bay', '')).toBe('Pacifica to Half Moon Bay');
  });

  it('lowercases short prepositions except when first word', () => {
    expect(formatTripName('the_road_to_nowhere', '')).toBe('The Road to Nowhere');
    expect(formatTripName('to_the_coast', '')).toBe('To the Coast');
  });

  it('falls back to name when hashtag is null', () => {
    expect(formatTripName(null, 'Morning Ride')).toBe('Morning Ride');
  });

  it('handles single-word hashtags', () => {
    expect(formatTripName('otb', '')).toBe('Otb');
  });

  it('returns empty string for null hashtag and empty fallback', () => {
    expect(formatTripName(null, '')).toBe('');
  });
});
