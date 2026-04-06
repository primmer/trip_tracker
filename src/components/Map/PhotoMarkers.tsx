import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
// the thumbnail visually render in the 3D scene. The previous imperative
// approach had correct DOM structure but no visual output; using the React
// Marker3D component's built-in content-slot handling fixes this.
//
// When onClick is provided, Marker3D uses gmp-marker-3d-interactive so the
// marker fires gmp-click events in response to user gestures in the 3D scene.
const PhotoMarkerItem: React.FC<PhotoMarkerItemProps> = ({ photo, onPhotoSelect }) => {
  // Stable ref to avoid re-creating the callback (and re-registering event
  // listeners) on every parent render when onPhotoSelect is an inline lambda.
  const onPhotoSelectRef = useRef(onPhotoSelect);
  useEffect(() => {
    onPhotoSelectRef.current = onPhotoSelect;
  });

  const handleClick = useCallback(() => {
    onPhotoSelectRef.current?.(photo);
  }, [photo]);

  return (
    <Marker3D
      position={{ lat: photo.lat!, lng: photo.lng!, altitude: 0 }}
      altitudeMode={AltitudeMode.CLAMP_TO_GROUND}
      onClick={handleClick}
      zIndex={500}
    >
      <img
        src={photo.downloadUrl}
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
