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

// Individual photo marker using the React Marker3D component.
//
// Marker3D automatically wraps <img> children in a <template slot="default">
// as required by the gmp-marker-3d web component API — this is what makes
// the thumbnail visually render in the 3D scene.
//
// CORS workaround: gmp-marker-3d-interactive enforces crossorigin="anonymous"
// on <img> elements in its shadow DOM, and Chrome sends cookies by default
// for googleapis.com requests, making them credentialed. Credentialed CORS
// requests are rejected when the server returns Access-Control-Allow-Origin: *
// (requires a specific origin). We work around this by pre-fetching each image
// with credentials:'omit' and using same-origin blob URLs as the img src.
// Blob URLs bypass the shadow DOM CORS enforcement entirely.
const PhotoMarkerItem: React.FC<PhotoMarkerItemProps> = ({ photo, onPhotoSelect }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Pre-fetch photo as blob URL to bypass CORS enforcement in shadow DOM.
  useEffect(() => {
    let canceled = false;

    const load = async () => {
      try {
        const res = await fetch(photo.downloadUrl, {
          credentials: 'omit',
          cache: 'reload',
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (canceled) {
          URL.revokeObjectURL(url);
          return;
        }
        setBlobUrl(url);
      } catch {
        // fetch unavailable — marker renders without thumbnail
      }
    };
    load();

    return () => {
      canceled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [photo.downloadUrl]);

  // Stable ref to avoid re-creating the callback (and re-registering event
  // listeners) on every parent render when onPhotoSelect is an inline lambda.
  const onPhotoSelectRef = useRef(onPhotoSelect);
  useEffect(() => {
    onPhotoSelectRef.current = onPhotoSelect;
  });

  const handleClick = useCallback(() => {
    onPhotoSelectRef.current?.(photo);
  }, [photo]);

  if (!blobUrl) return null;

  return (
    <Marker3D
      position={{ lat: photo.lat!, lng: photo.lng!, altitude: 0 }}
      altitudeMode={AltitudeMode.CLAMP_TO_GROUND}
      onClick={handleClick}
      zIndex={500}
    >
      <img
        src={blobUrl}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid white',
          objectFit: 'cover',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          display: 'block',
        }}
        alt=""
      />
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
