export interface ReverseGeocodeResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface PlaceResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  types: string[];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not set in environment.');
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Geocoding API error: ${response.status} ${errorBody}`);
    return null;
  }

  const data = await response.json();
  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0];
  }

  return null;
}

export async function searchNearby(
  lat: number,
  lng: number,
  radius: number = 5000,
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not set in environment.');
  }

  // Google Places API (New) searchNearby
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.types',
    },
    body: JSON.stringify({
      includedTypes: ['mountain_peak', 'natural_feature', 'park'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radius,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Places API (New) error: ${response.status} ${errorBody}`);
    return [];
  }

  const data = await response.json();
  return data.places || [];
}
