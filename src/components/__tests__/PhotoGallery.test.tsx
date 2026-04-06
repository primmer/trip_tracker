import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoGallery } from '../PhotoGallery';
import { Photo } from '../Map/PhotoMarkers';

const mockPhotos: Photo[] = [
  {
    id: '1',
    filename: 'photo1.jpg',
    downloadUrl: 'http://example.com/photo1.jpg',
    lat: 37.7749,
    lng: -122.4194,
    createdAt: '2026-03-23T10:00:00Z',
  },
  {
    id: '2',
    filename: 'photo2.jpg',
    downloadUrl: 'http://example.com/photo2.jpg',
    lat: null,
    lng: null,
    createdAt: '2026-03-23T11:00:00Z',
  },
  {
    id: '3',
    filename: 'photo3.jpg',
    downloadUrl: 'http://example.com/photo3.jpg',
    lat: 37.775,
    lng: -122.4195,
    createdAt: '2026-03-24T09:00:00Z',
  },
];

describe('PhotoGallery', () => {
  it('renders empty state when no photos are provided', () => {
    render(<PhotoGallery photos={[]} />);
    expect(screen.getByText(/No photos yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Click "Add Photos"/i)).toBeInTheDocument();
  });

  it('renders photos grouped by date', () => {
    render(<PhotoGallery photos={mockPhotos} />);

    // Check for date headings
    // Note: the exact string depends on the locale, but we can check for parts of it
    // In our implementation it uses 'long' date format
    expect(screen.getByText(/Monday, March 23, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuesday, March 24, 2026/i)).toBeInTheDocument();

    // Check for photo counts
    expect(screen.getByText('2 photos')).toBeInTheDocument();
    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('shows geolocated status correctly', () => {
    render(<PhotoGallery photos={mockPhotos} />);

    const geolocatedLabels = screen.getAllByText(/Geolocated/i);
    expect(geolocatedLabels).toHaveLength(2);

    const noLocationLabels = screen.getAllByText(/No location/i);
    expect(noLocationLabels).toHaveLength(1);
  });

  it('calls onPhotoClick when a photo is clicked', () => {
    const onPhotoClick = vi.fn();
    render(<PhotoGallery photos={mockPhotos} onPhotoClick={onPhotoClick} />);

    const photoElements = screen.getAllByRole('presentation');
    fireEvent.click(photoElements[0]);

    expect(onPhotoClick).toHaveBeenCalledWith(mockPhotos[0]);
  });
});
