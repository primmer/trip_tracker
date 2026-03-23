import React from 'react';
import { AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Camera, Calendar as CalendarIcon } from 'lucide-react';

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
}

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({ photos }) => {
  const [selectedPhotoId, setSelectedPhotoId] = React.useState<string | null>(null);
  const map = useMap();

  const validPhotos = photos.filter(p => p.lat !== null && p.lng !== null);
  const selectedPhoto = React.useMemo(() => 
    photos.find(p => p.id === selectedPhotoId), 
    [photos, selectedPhotoId]
  );

  if (!map) return null;

  return (
    <>
      {validPhotos.map((photo) => (
        <AdvancedMarker
          key={photo.id}
          position={{ lat: photo.lat!, lng: photo.lng! }}
          onClick={() => setSelectedPhotoId(photo.id)}
        >
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden transition-transform hover:scale-110 active:scale-95 bg-gray-200">
              <img 
                src={photo.downloadUrl} 
                alt={photo.filename}
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

      {selectedPhoto && (
        <InfoWindow
          position={{ lat: selectedPhoto.lat!, lng: selectedPhoto.lng! }}
          onCloseClick={() => setSelectedPhotoId(null)}
          headerDisabled
        >
          <div className="p-0 max-w-[280px] overflow-hidden rounded-lg">
            <div className="aspect-video w-full bg-gray-100 overflow-hidden">
              <img 
                src={selectedPhoto.downloadUrl} 
                alt={selectedPhoto.filename} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-3 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>{new Date(selectedPhoto.createdAt).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};
