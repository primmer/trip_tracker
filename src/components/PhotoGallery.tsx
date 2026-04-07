import React, { useMemo } from 'react';
import { Photo } from './Map/PhotoMarkers';
import { Image as ImageIcon, MapPin, Clock, Play } from 'lucide-react';

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, onPhotoClick }) => {
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Photo[]> = {};

    const sortedPhotos = [...photos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    sortedPhotos.forEach((photo) => {
      const date = new Date(photo.createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(photo);
    });

    return Object.entries(groups).sort(
      (a, b) => new Date(a[1][0].createdAt).getTime() - new Date(b[1][0].createdAt).getTime(),
    );
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center bg-gray-900">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-700">
          <ImageIcon className="w-10 h-10 text-gray-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No photos yet</h3>
        <p className="text-gray-400 max-w-sm">
          Click "Add Photos" to attach trip photos from your Google Photos library.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-12">
        {groupedPhotos.map(([date, dayPhotos]) => (
          <section key={date} className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-400">{date}</h2>
              <span className="text-xs text-gray-500">
                {dayPhotos.length} {dayPhotos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {dayPhotos.map((photo) => {
                const isVideo = photo.mediaType === 'video';
                return (
                  <div
                    key={photo.id}
                    className="group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1"
                    onClick={() => onPhotoClick?.(photo)}
                  >
                    <div className="aspect-square w-full bg-gray-800 overflow-hidden relative">
                      {isVideo ? (
                        <>
                          <video
                            src={photo.downloadUrl}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            preload="metadata"
                          />
                          {/* Custom play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                          {/* Video indicator badge */}
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-medium text-white">
                            VIDEO
                          </div>
                        </>
                      ) : (
                        <img
                          src={photo.downloadUrl}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>

                    <div className="px-3 py-2 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(photo.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {photo.lat !== null && photo.lng !== null ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
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
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
