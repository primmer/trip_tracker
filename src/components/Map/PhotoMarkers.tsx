import React from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Camera } from 'lucide-react';

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

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({ photos, onPhotoSelect }) => {
  const map = useMap();
  const validPhotos = photos.filter((p) => p.lat !== null && p.lng !== null);

  if (!map) return null;

  return (
    <>
      {validPhotos.map((photo) => (
        <AdvancedMarker
          key={photo.id}
          position={{ lat: photo.lat!, lng: photo.lng! }}
          onClick={() => onPhotoSelect?.(photo)}
        >
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden transition-transform hover:scale-110 active:scale-95 bg-gray-200">
              <img
                src={photo.downloadUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-0.5 border border-white shadow-sm">
              <Camera className="w-2 h-2 text-white" />
            </div>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
};
