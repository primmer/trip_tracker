/**
 * Converts meters to feet.
 * 1 meter = 3.28084 feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Converts meters to miles.
 * 1 mile = 1609.34 meters
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Converts meters to kilometers.
 */
export function metersToKm(meters: number): number {
  return meters / 1000;
}

/**
 * Formats duration in seconds to "Xh Ym" string.
 */
export function secondsToDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

const LOWERCASE_WORDS = new Set([
  'to',
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'at',
  'and',
  'or',
  'for',
]);

/**
 * Converts a hashtag or raw trip name into a display title.
 * e.g. "pacifica_to_half_moon_bay_july_4" -> "Pacifica to Half Moon Bay July 4"
 */
export function formatTripName(hashtag: string | null, fallback: string): string {
  const raw = hashtag || fallback;
  if (!raw) return '';
  const words = raw.replace(/_/g, ' ').split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
