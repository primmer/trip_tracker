import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripDetail } from '../TripDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import { Trip } from '../../types';
import { Photo } from '../../components/Map/PhotoMarkers';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  documentId: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock components that use Google Maps or complex logic
vi.mock('../../components/Map/TripMap', () => ({
  TripMap: () => <div data-testid="trip-map" />,
}));

interface PhotoGalleryProps {
  onPhotoClick: (photo: Photo) => void;
}

vi.mock('../../components/PhotoGallery', () => ({
  PhotoGallery: ({ onPhotoClick }: PhotoGalleryProps) => (
    <div data-testid="photo-gallery">
      <button 
        data-testid="photo-item" 
        onClick={() => onPhotoClick({
          id: 'photo1',
          downloadUrl: 'http://example.com/photo1.jpg',
          filename: 'photo1.jpg',
          createdAt: '2024-01-01T10:00:00Z',
          lat: 37,
          lng: -122
        } as Photo)}
      >
        Photo 1
      </button>
    </div>
  ),
}));

vi.mock('../../components/ElevationChart', () => ({
  ElevationChart: () => <div data-testid="elevation-chart" />,
}));

describe('TripDetail Fullscreen Overlay', () => {
  const mockTrip: Trip = {
    id: 'test-trip',
    hashtag: 'test-trip',
    name: 'Test Trip',
    dateRange: { start: '2024-01-01', end: '2024-01-01' },
    activityIds: [123],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Firestore mocks
    vi.mocked(firestore.getDoc).mockResolvedValue({
      exists: () => true,
      id: 'test-trip',
      data: () => mockTrip,
    } as unknown as firestore.DocumentSnapshot);

    vi.mocked(firestore.doc).mockImplementation((_db: unknown, collection: string, id: string) => {
      return { id, path: `${collection}/${id}` } as unknown as firestore.DocumentReference;
    });

    vi.mocked(firestore.getDocs).mockImplementation(() => {
      return Promise.resolve({
        docs: [],
      } as unknown as firestore.QuerySnapshot);
    });

    // Mock fetch for streams
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latlng: [], altitude: [], time: [], distance: [] }),
    } as unknown as Response);
  });

  it('verifies fullscreen overlay close button size and accessibility', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/trip/test-trip']}>
          <Routes>
            <Route path="/trip/:tripId" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Switch to Gallery view
    const galleryButton = screen.getByRole('button', { name: /gallery/i });
    await act(async () => {
      fireEvent.click(galleryButton);
    });

    // Find the photo item in the gallery (it should be rendered now)
    const photoItem = await screen.findByTestId('photo-item');
    fireEvent.click(photoItem);

    // Find the close button
    const closeButton = screen.getByRole('button', { name: /close fullscreen view/i });
    expect(closeButton).toBeInTheDocument();

    // Verify Tailwind classes for size (min-h-[44px] min-w-[44px])
    expect(closeButton.className).toContain('min-h-[44px]');
    expect(closeButton.className).toContain('min-w-[44px]');
    
    // Verify it's a flex container for centering
    expect(closeButton.className).toContain('flex');
    expect(closeButton.className).toContain('items-center');
    expect(closeButton.className).toContain('justify-center');

    // Click close button
    fireEvent.click(closeButton);

    // Verify overlay is closed
    expect(screen.queryByRole('button', { name: /close fullscreen view/i })).not.toBeInTheDocument();
  });
});
