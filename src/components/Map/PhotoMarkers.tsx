import React, { useEffect, useMemo, useRef } from 'react';
import { useMap3D } from '@vis.gl/react-google-maps';

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

// Local type extension — Marker3DInteractiveElement is not yet in @types/google.maps 3.58.1
interface Marker3DInteractiveEl extends HTMLElement {
  position: google.maps.LatLngAltitudeLiteral | null;
  altitudeMode: string;
}

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({ photos, onPhotoSelect }) => {
  const map3d = useMap3D();

  // Keep a stable ref to the callback so the effect doesn't re-run on every render
  const onPhotoSelectRef = useRef(onPhotoSelect);
  useEffect(() => {
    onPhotoSelectRef.current = onPhotoSelect;
  });

  const validPhotos = useMemo(
    () => photos.filter((p) => p.lat !== null && p.lng !== null),
    [photos],
  );

  useEffect(() => {
    if (!map3d) return;

    const markers: HTMLElement[] = [];

    validPhotos.forEach((photo) => {
      const marker = document.createElement(
        'gmp-marker-3d-interactive',
      ) as Marker3DInteractiveEl;
      marker.position = { lat: photo.lat!, lng: photo.lng!, altitude: 0 };
      marker.altitudeMode = google.maps.maps3d.AltitudeMode.CLAMP_TO_GROUND;

      const template = document.createElement('template');
      const img = document.createElement('img');
      img.src = photo.downloadUrl;
      img.style.cssText =
        'width:40px;height:40px;border-radius:50%;border:2px solid white;object-fit:cover;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer;display:block;';
      template.content.appendChild(img);
      marker.appendChild(template);

      marker.addEventListener('gmp-click', () => {
        onPhotoSelectRef.current?.(photo);
      });

      map3d.append(marker);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [map3d, validPhotos]);

  return null;
};
