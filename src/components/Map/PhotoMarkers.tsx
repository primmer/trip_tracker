import React from 'react';
import { Marker, InfoWindow } from '@vis.gl/react-google-maps';
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
}

export const PhotoMarkers: React.FC<PhotoMarkersProps> = ({ photos }) => {
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);

  const validPhotos = photos.filter(p => p.lat !== null && p.lng !== null);

  return (
    <>
      {validPhotos.map((photo) => (
        <Marker
          key={photo.id}
          position={{ lat: photo.lat!, lng: photo.lng! }}
          onClick={() => setSelectedPhoto(photo)}
          icon={{
            path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
            fillColor: "#ffffff",
            fillOpacity: 1,
            strokeColor: "#ef4444",
            strokeWeight: 2,
            scale: 1,
            anchor: new google.maps.Point(12, 12),
          }}
        />
      ))}

      {selectedPhoto && (
        <InfoWindow
          position={{ lat: selectedPhoto.lat!, lng: selectedPhoto.lng! }}
          onCloseClick={() => setSelectedPhoto(null)}
        >
          <div className="p-1 max-w-xs">
            <img 
              src={selectedPhoto.downloadUrl} 
              alt={selectedPhoto.filename} 
              className="w-full h-auto rounded-lg shadow-sm mb-2"
            />
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{new Date(selectedPhoto.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};
