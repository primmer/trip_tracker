import { reverseGeocode, searchNearby } from './maps.js';

export interface EnhancedDescription {
  title: string;
  pois: string[];
  enhanced_at: Date;
}

const GENERIC_TITLES = [
  'Morning Ride',
  'Afternoon Ride',
  'Evening Ride',
  'Lunch Ride',
  'Night Ride',
];

export function isGenericTitle(title: string): boolean {
  return GENERIC_TITLES.includes(title);
}

export async function enhanceActivityDescription(
  lat: number,
  lng: number,
): Promise<{ title: string; pois: string[] }> {
  const pois: string[] = [];
  const geocode = await reverseGeocode(lat, lng);

  if (geocode) {
    // Extract neighborhood or sub-locality
    const area = geocode.address_components.find(
      (c) =>
        c.types.includes('neighborhood') ||
        c.types.includes('sublocality') ||
        c.types.includes('locality'),
    );
    if (area) {
      pois.push(area.long_name);
    }
  }

  const places = await searchNearby(lat, lng);
  for (const place of places) {
    if (place.displayName && place.displayName.text) {
      pois.push(place.displayName.text);
    }
  }

  // Deduplicate POIs
  const uniquePois = Array.from(new Set(pois)).slice(0, 5);

  if (uniquePois.length === 0) {
    return { title: 'Scenic Ride', pois: [] };
  }

  // Generate title: "Ride through [POI1] and [POI2]" or similar
  let title = '';
  if (uniquePois.length >= 2) {
    title = `Ride through ${uniquePois[0]} and ${uniquePois[1]}`;
  } else {
    title = `Ride near ${uniquePois[0]}`;
  }

  return { title, pois: uniquePois };
}

export function generateEnhancedTitle(pois: string[]): string {
  if (pois.length === 0) return 'Scenic Ride';

  // Use unique POIs to build a descriptive title
  const uniquePois = Array.from(new Set(pois));

  if (uniquePois.length >= 3) {
    return `Ride through ${uniquePois[0]}, ${uniquePois[1]}, and ${uniquePois[2]}`;
  } else if (uniquePois.length === 2) {
    return `Ride through ${uniquePois[0]} and ${uniquePois[1]}`;
  } else {
    return `Exploring ${uniquePois[0]}`;
  }
}
