import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, logEvent, type Analytics } from 'firebase/analytics';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics - only in browser environment
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics may fail to initialize in some environments (ad blockers, etc.)
    // Fail silently - analytics is not critical functionality
  }
}
export { analytics };

/**
 * Log a custom event to Firebase Analytics
 * Events are silently ignored if analytics is not available
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    // Silently fail - analytics should never break functionality
  }
}

/**
 * Log a page view event
 */
export function trackPageView(pageName: string, params?: Record<string, string | number>): void {
  trackEvent('page_view', {
    page_title: pageName,
    ...params,
  });
}
