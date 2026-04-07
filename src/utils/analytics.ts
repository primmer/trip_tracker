import { trackEvent, trackPageView } from '../firebase';

/**
 * Analytics event names for the Trip Tracker app
 */
export const AnalyticsEvents = {
  // Page views
  PAGE_HOME: 'page_home',
  PAGE_TRIPS: 'page_trips',
  PAGE_TRIP_DETAIL: 'page_trip_detail',
  PAGE_ABOUT: 'page_about',
  PAGE_ADMIN: 'page_admin',

  // Trip interactions
  TRIP_VIEW: 'trip_view',
  TRIP_CARD_CLICK: 'trip_card_click',

  // Photo interactions
  PHOTO_GALLERY_OPEN: 'photo_gallery_open',
  PHOTO_VIEW: 'photo_view',
  PHOTO_NAVIGATE: 'photo_navigate',
  PHOTO_ZOOM: 'photo_zoom',
  VIDEO_PLAY: 'video_play',

  // Map interactions
  MAP_MARKER_CLICK: 'map_marker_click',
  MAP_ROUTE_ANIMATION: 'map_route_animation',
  MAP_3D_TOGGLE: 'map_3d_toggle',

  // Admin actions
  ADMIN_SYNC_STRAVA: 'admin_sync_strava',
  ADMIN_SYNC_PHOTOS: 'admin_sync_photos',
  ADMIN_EDIT_TRIP: 'admin_edit_trip',
  ADMIN_DELETE_TRIP: 'admin_delete_trip',
  ADMIN_PHOTO_PICKER_OPEN: 'admin_photo_picker_open',
  ADMIN_PHOTO_ASSIGNED: 'admin_photo_assigned',
} as const;

/**
 * Track when a page is viewed
 */
export function logPageView(pageName: string, params?: Record<string, string | number>): void {
  trackPageView(pageName, params);
}

/**
 * Track when a trip detail page is viewed
 */
export function logTripView(tripId: string, tripName: string, photoCount: number): void {
  trackEvent(AnalyticsEvents.TRIP_VIEW, {
    trip_id: tripId,
    trip_name: tripName,
    photo_count: photoCount,
  });
}

/**
 * Track when a trip card is clicked (from home or trips list)
 */
export function logTripCardClick(tripId: string, source: 'home' | 'trips'): void {
  trackEvent(AnalyticsEvents.TRIP_CARD_CLICK, {
    trip_id: tripId,
    source,
  });
}

/**
 * Track when photo gallery is opened
 */
export function logPhotoGalleryOpen(tripId: string, initialPhotoId: string): void {
  trackEvent(AnalyticsEvents.PHOTO_GALLERY_OPEN, {
    trip_id: tripId,
    photo_id: initialPhotoId,
  });
}

/**
 * Track when a specific photo is viewed
 */
export function logPhotoView(
  photoId: string,
  isVideo: boolean,
  tripId: string,
  index: number,
): void {
  trackEvent(AnalyticsEvents.PHOTO_VIEW, {
    photo_id: photoId,
    media_type: isVideo ? 'video' : 'photo',
    trip_id: tripId,
    index,
  });
}

/**
 * Track when user navigates between photos in gallery
 */
export function logPhotoNavigate(
  direction: 'prev' | 'next',
  tripId: string,
  photoId: string,
): void {
  trackEvent(AnalyticsEvents.PHOTO_NAVIGATE, {
    direction,
    trip_id: tripId,
    photo_id: photoId,
  });
}

/**
 * Track when a map marker is clicked
 */
export function logMapMarkerClick(markerType: 'photo' | 'activity', id: string): void {
  trackEvent(AnalyticsEvents.MAP_MARKER_CLICK, {
    marker_type: markerType,
    marker_id: id,
  });
}

/**
 * Track when route animation is played/paused
 */
export function logRouteAnimation(action: 'play' | 'pause' | 'reset', tripId: string): void {
  trackEvent(AnalyticsEvents.MAP_ROUTE_ANIMATION, {
    action,
    trip_id: tripId,
  });
}

/**
 * Track admin sync actions
 */
export function logAdminSync(type: 'strava' | 'photos'): void {
  trackEvent(
    type === 'strava' ? AnalyticsEvents.ADMIN_SYNC_STRAVA : AnalyticsEvents.ADMIN_SYNC_PHOTOS,
  );
}

/**
 * Track admin trip edits
 */
export function logAdminEditTrip(tripId: string, action: 'update' | 'delete'): void {
  trackEvent(
    action === 'delete' ? AnalyticsEvents.ADMIN_DELETE_TRIP : AnalyticsEvents.ADMIN_EDIT_TRIP,
    { trip_id: tripId },
  );
}

/**
 * Track when admin opens photo picker
 */
export function logAdminPhotoPickerOpen(tripId: string): void {
  trackEvent(AnalyticsEvents.ADMIN_PHOTO_PICKER_OPEN, { trip_id: tripId });
}

/**
 * Track when photos are assigned to a trip
 */
export function logAdminPhotoAssigned(tripId: string, count: number): void {
  trackEvent(AnalyticsEvents.ADMIN_PHOTO_ASSIGNED, {
    trip_id: tripId,
    photo_count: count,
  });
}
