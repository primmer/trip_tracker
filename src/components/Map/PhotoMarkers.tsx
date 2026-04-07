import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker3D, AltitudeMode } from '@vis.gl/react-google-maps';
import { Activity } from '../../types';
import { ROUTE_COLORS } from './routeColors';

export interface Photo {
  id: string;
  filename: string;
  downloadUrl: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  mediaType?: 'photo' | 'video';
  fps?: number | null;
}

interface PhotoMarkersProps {
  photos: Photo[];
  activities?: Activity[];
  onPhotoSelect?: (photo: Photo) => void;
}

interface PhotoMarkerItemProps {
  photo: Photo;
  activities?: Activity[];
  onPhotoSelect?: (photo: Photo) => void;
}

function toProxyUrl(url: string): string {
  if (!import.meta.env.DEV) return url;
  const prefix = 'https://storage.googleapis.com/';
  if (url.startsWith(prefix)) {
    return '/storage-proxy/' + url.slice(prefix.length);
  }
  return url;
}

function resizeToThumbnail(
  img: HTMLImageElement,
  size: number,
  borderColor: string,
): Promise<string> {
  const border = 3;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Border circle with ride-specific color
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  // Clip to inner circle for photo
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - border, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // Draw photo cover-fit
  const inner = size - border * 2;
  const scale = Math.max(inner / img.naturalWidth, inner / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();
  // Camera badge at bottom-right (subtle, in border color)
  const bx = size - 7;
  const by = size - 7;
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.fillRect(bx - 2.5, by - 1.5, 5, 3.5);
  ctx.beginPath();
  ctx.arc(bx, by, 1, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(URL.createObjectURL(b!)), 'image/png'),
  );
}

async function createVideoThumbnail(
  videoUrl: string,
  size: number,
  borderColor: string,
): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    let resolved = false;

    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeEventListener('seeked', onSeeked);
    };

    const resolveOnce = (url: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(url);
      }
    };

    const onError = () => {
      // Fallback to color placeholder
      resolveOnce(createPlaceholderThumbnail(size, borderColor));
    };

    const onSeeked = () => {
      // Validate video dimensions
      if (!video.videoWidth || !video.videoHeight) {
        resolveOnce(createPlaceholderThumbnail(size, borderColor));
        return;
      }

      const border = 3;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Border circle with ride-specific color
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = borderColor;
      ctx.fill();

      // Clip to inner circle for video frame
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - border, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw video frame cover-fit
      const inner = size - border * 2;
      const scale = Math.max(inner / video.videoWidth, inner / video.videoHeight);
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.drawImage(video, (size - w) / 2, (size - h) / 2, w, h);
      ctx.restore();

      // Play triangle overlay
      const playSize = size * 0.25;
      ctx.beginPath();
      ctx.moveTo(size / 2 - playSize / 3, size / 2 - playSize / 2);
      ctx.lineTo(size / 2 - playSize / 3, size / 2 + playSize / 2);
      ctx.lineTo(size / 2 + playSize / 2, size / 2);
      ctx.closePath();
      ctx.fillStyle = borderColor;
      ctx.fill();

      resolveOnce(canvas.toDataURL('image/png'));
    };

    const onLoaded = () => {
      // Check if video has valid duration
      if (!video.duration || !isFinite(video.duration)) {
        resolveOnce(createPlaceholderThumbnail(size, borderColor));
        return;
      }
      // Seek to 10% of the video or 1 second
      const seekTime = Math.min(1, video.duration * 0.1) || 0.5;
      video.currentTime = seekTime;
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
    video.addEventListener('seeked', onSeeked);

    // Timeout fallback after 5 seconds
    setTimeout(() => {
      resolveOnce(createPlaceholderThumbnail(size, borderColor));
    }, 5000);

    video.src = toProxyUrl(videoUrl);
  });
}

function createPlaceholderThumbnail(size: number, borderColor: string): string {
  const border = 3;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Border circle with ride-specific color
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  // Inner circle with subtle gradient
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - border, 0, Math.PI * 2);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#374151');
  gradient.addColorStop(1, '#1f2937');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Play triangle in center
  const playSize = size * 0.3;
  ctx.beginPath();
  ctx.moveTo(size / 2 - playSize / 3, size / 2 - playSize / 2);
  ctx.lineTo(size / 2 - playSize / 3, size / 2 + playSize / 2);
  ctx.lineTo(size / 2 + playSize / 2, size / 2);
  ctx.closePath();
  ctx.fillStyle = borderColor;
  ctx.fill();

  return canvas.toDataURL('image/png');
}

const PhotoMarkerItem: React.FC<PhotoMarkerItemProps> = ({ photo, activities, onPhotoSelect }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const onPhotoSelectRef = useRef(onPhotoSelect);
  useEffect(() => {
    onPhotoSelectRef.current = onPhotoSelect;
  });

  // Determine which ride this photo belongs to based on timestamp
  const borderColor = useMemo(() => {
    if (!activities || activities.length === 0) return '#ffffff';
    const photoTime = new Date(photo.createdAt).getTime();

    // Find the matching ride by time range
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const start = new Date(activity.start_date).getTime();
      const end = start + activity.elapsed_time * 1000;
      // Add 5-minute buffer on each side for photos taken just before/after
      const bufferMs = 5 * 60 * 1000;
      if (photoTime >= start - bufferMs && photoTime <= end + bufferMs) {
        return ROUTE_COLORS[i % ROUTE_COLORS.length];
      }
    }

    // If no match, assign to nearest ride (for photos between rides or outside all ranges)
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const start = new Date(activity.start_date).getTime();
      const end = start + activity.elapsed_time * 1000;
      const mid = (start + end) / 2;
      const distance = Math.abs(photoTime - mid);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    return ROUTE_COLORS[nearestIndex % ROUTE_COLORS.length];
  }, [photo.createdAt, activities]);

  const isVideo = photo.mediaType === 'video';

  useEffect(() => {
    let canceled = false;

    if (isVideo) {
      // Load video and extract frame for thumbnail
      createVideoThumbnail(photo.downloadUrl, 44, borderColor)
        .then((url) => {
          if (!canceled) setThumbUrl(url);
        })
        .catch(() => {
          // Fallback to placeholder on any error
          if (!canceled) setThumbUrl(createPlaceholderThumbnail(44, borderColor));
        });
      return () => {
        canceled = true;
      };
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (canceled) return;
      const url = await resizeToThumbnail(img, 44, borderColor);
      if (!canceled) setThumbUrl(url);
    };
    img.src = toProxyUrl(photo.downloadUrl);
    return () => {
      canceled = true;
      setThumbUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [photo.downloadUrl, borderColor, isVideo]);

  const handleClick = useCallback(() => {
    onPhotoSelectRef.current?.(photo);
  }, [photo]);

  if (!thumbUrl) return null;

  return (
    <Marker3D
      position={{ lat: photo.lat!, lng: photo.lng!, altitude: 0 }}
      altitudeMode={AltitudeMode.CLAMP_TO_GROUND}
      onClick={handleClick}
      zIndex={500}
    >
      <img src={thumbUrl} alt="" />
    </Marker3D>
  );
};

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({
  photos,
  activities,
  onPhotoSelect,
}) => {
  const validPhotos = useMemo(
    () => photos.filter((p) => p.lat !== null && p.lng !== null),
    [photos],
  );

  return (
    <>
      {validPhotos.map((photo) => (
        <PhotoMarkerItem
          key={photo.id}
          photo={photo}
          activities={activities}
          onPhotoSelect={onPhotoSelect}
        />
      ))}
    </>
  );
};
