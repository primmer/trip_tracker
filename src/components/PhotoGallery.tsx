import React, { useMemo } from 'react';
import { Photo } from './Map/PhotoMarkers';
import { Calendar, Image as ImageIcon, MapPin, Clock } from 'lucide-react';

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, onPhotoClick }) => {
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Photo[]> = {};
    
    // Sort photos chronologically first
    const sortedPhotos = [...photos].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedPhotos.forEach(photo => {
      const date = new Date(photo.createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(photo);
    });

    return Object.entries(groups).sort((a, b) => 
      new Date(a[1][0].createdAt).getTime() - new Date(b[1][0].createdAt).getTime()
    );
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ImageIcon className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No photos yet</h3>
        <p className="text-gray-500 max-w-sm">
          Click "Add Photos" to attach trip photos from your Google Photos library.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-12">
        {groupedPhotos.map(([date, dayPhotos]) => (
          <section key={date} className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{date}</h2>
              <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {dayPhotos.length} {dayPhotos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {dayPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                  onClick={() => onPhotoClick?.(photo)}
                >
                  <div className="aspect-square w-full bg-gray-200 overflow-hidden">
                    <img 
                      src={photo.downloadUrl} 
                      alt={photo.filename}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(photo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {photo.lat !== null && photo.lng !== null ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                        <MapPin className="w-3 h-3" />
                        <span>Geolocated</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500 italic">
                        <MapPin className="w-3 h-3" />
                        <span>No location</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      View Large
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
