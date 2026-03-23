import { describe, it, expect } from 'vitest';
import { metersToFeet, metersToMiles, metersToKm, secondsToDuration } from '../units';

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
