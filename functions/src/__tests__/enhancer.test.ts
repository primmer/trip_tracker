import { describe, it, expect } from 'vitest';
import { isGenericTitle, generateEnhancedTitle } from '../services/enhancer.js';

describe('isGenericTitle', () => {
  it('identifies generic titles', () => {
    expect(isGenericTitle('Morning Ride')).toBe(true);
    expect(isGenericTitle('Afternoon Ride')).toBe(true);
    expect(isGenericTitle('Evening Ride')).toBe(true);
    expect(isGenericTitle('Lunch Ride')).toBe(true);
    expect(isGenericTitle('Night Ride')).toBe(true);
  });

  it('identifies non-generic titles', () => {
    expect(isGenericTitle('Epic MTB Trip')).toBe(false);
    expect(isGenericTitle('Ride through the park')).toBe(false);
    expect(isGenericTitle('')).toBe(false);
    expect(isGenericTitle('Another Ride')).toBe(false);
  });
});

describe('generateEnhancedTitle', () => {
  it('generates title for 3+ POIs', () => {
    const pois = ['Mountain A', 'Park B', 'Ridge C', 'D'];
    expect(generateEnhancedTitle(pois)).toBe('Ride through Mountain A, Park B, and Ridge C');
  });

  it('generates title for 2 POIs', () => {
    const pois = ['Mountain A', 'Park B'];
    expect(generateEnhancedTitle(pois)).toBe('Ride through Mountain A and Park B');
  });

  it('generates title for 1 POI', () => {
    const pois = ['Mountain A'];
    expect(generateEnhancedTitle(pois)).toBe('Exploring Mountain A');
  });

  it('generates fallback for 0 POIs', () => {
    expect(generateEnhancedTitle([])).toBe('Scenic Ride');
  });

  it('deduplicates POIs', () => {
    const pois = ['Mountain A', 'Mountain A', 'Park B'];
    expect(generateEnhancedTitle(pois)).toBe('Ride through Mountain A and Park B');
  });
});
