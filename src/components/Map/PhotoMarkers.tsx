import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker3D, AltitudeMode } from '@vis.gl/react-google-maps';

export interface Photo {
  id: string;
  filename: string;
  downloadUrl: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

interface PhotoMarkersProps {
  photos: Photo[];
  onPhotoSelect?: (photo: Photo) => void;
}

interface PhotoMarkerItemProps {
  photo: Photo;
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

function resizeToThumbnail(img: HTMLImageElement, size: number): Promise<string> {
  const border = 3;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // White border circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
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
  // Blue camera badge at bottom-right
  const bx = size - 7;
  const by = size - 7;
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.fillRect(bx - 2.5, by - 1.5, 5, 3.5);
  ctx.beginPath();
  ctx.arc(bx, by, 1, 0, Math.PI * 2);
  ctx.fillStyle = '#2563eb';
  ctx.fill();

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(URL.createObjectURL(b!)), 'image/png'),
  );
}

const PhotoMarkerItem: React.FC<PhotoMarkerItemProps> = ({ photo, onPhotoSelect }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const onPhotoSelectRef = useRef(onPhotoSelect);
  useEffect(() => {
    onPhotoSelectRef.current = onPhotoSelect;
  });

  useEffect(() => {
    let canceled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (canceled) return;
      const url = await resizeToThumbnail(img, 44);
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
  }, [photo.downloadUrl]);

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

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({ photos, onPhotoSelect }) => {
  const validPhotos = useMemo(
    () => photos.filter((p) => p.lat !== null && p.lng !== null),
    [photos],
  );

  return (
    <>
      {validPhotos.map((photo) => (
        <PhotoMarkerItem key={photo.id} photo={photo} onPhotoSelect={onPhotoSelect} />
      ))}
    </>
  );
};
