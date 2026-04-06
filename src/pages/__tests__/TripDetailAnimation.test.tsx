import { render, screen, fireEvent, act, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripDetail } from '../TripDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import { Activity, ActivityStreams, Trip } from '../../types';

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

interface TripMapProps {
  animationState: {
    isPlaying: boolean;
    speed: number;
    activityId: number | null;
  };
  onAnimationComplete: () => void;
}

// Mock components that use Google Maps
vi.mock('../../components/Map/TripMap', () => ({
  TripMap: ({ animationState, onAnimationComplete }: TripMapProps) => (
    <div data-testid="trip-map">
      {animationState.isPlaying && (
        <button onClick={onAnimationComplete} data-testid="complete-animation">
          Complete
        </button>
      )}
      <div data-testid="animation-status">{animationState.isPlaying ? 'Playing' : 'Paused'}</div>
      <div data-testid="animation-speed">{animationState.speed}x</div>
    </div>
  ),
}));

vi.mock('../../components/ElevationChart', () => ({
  ElevationChart: () => <div data-testid="elevation-chart" />,
}));

describe('TripDetail Animation Controls', () => {
  const mockTrip: Trip = {
    id: 'test-trip',
    hashtag: 'test-trip',
    name: 'Test Trip',
    dateRange: { start: '2024-01-01', end: '2024-01-01' },
    activityIds: [123],
  };

  const mockActivity: Partial<Activity> = {
    id: 123,
    name: 'Day 1 Ride',
    distance: 10000,
    total_elevation_gain: 500,
    elapsed_time: 3600,
    start_date: '2024-01-01T08:00:00Z',
  };

  const mockStream: ActivityStreams = {
    latlng: [
      [37, -122],
      [37.1, -122.1],
    ],
    altitude: [100, 200],
    distance: [0, 10000],
    time: [0, 3600],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Firestore mocks
    vi.mocked(firestore.getDoc).mockImplementation((docRef: unknown) => {
      const ref = docRef as { path: string; id: string };
      console.log('getDoc for path:', ref.path);
      return Promise.resolve({
        exists: () => true,
        id: ref.id || 'test-trip',
        data: () => {
          if (ref.path?.includes('streams')) return mockStream;
          if (ref.path?.includes('activities')) return mockActivity;
          return mockTrip;
        },
      } as unknown as firestore.DocumentSnapshot);
    });

    vi.mocked(firestore.doc).mockImplementation((_db: unknown, collection: string, id: string) => {
      return { id, path: `${collection}/${id}` } as unknown as firestore.DocumentReference;
    });

    vi.mocked(firestore.getDocs).mockImplementation(() => {
      return Promise.resolve({
        docs: [
          {
            id: '123',
            data: () => mockActivity,
          },
        ],
      } as unknown as firestore.QuerySnapshot);
    });
  });

  const renderTripDetail = async (): Promise<RenderResult> => {
    let result: RenderResult = {} as RenderResult;
    await act(async () => {
      result = render(
        <MemoryRouter initialEntries={['/trip/test-trip']}>
          <Routes>
            <Route path="/trip/:tripId" element={<TripDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    return result;
  };

  it('verifies animation controls and behavior', async () => {
    await renderTripDetail();

    // 1. Verify Day 1 stats card and animation controls
    await screen.findByTitle(/Play/i);
    expect(screen.getByText(/test-trip/i)).toBeInTheDocument();
    const playButton = screen.getByTitle(/Play/i).closest('button');
    const speedButton = screen.getByRole('button', { name: /Speed:/i });
    expect(playButton).toBeInTheDocument();
    expect(speedButton).toBeInTheDocument();

    // 2. Click Play button
    await act(async () => {
      fireEvent.click(playButton!);
    });

    // 3. Verify Play changes to Pause
    expect(screen.queryByTitle(/Play/i)).not.toBeInTheDocument();
    expect(screen.getByTitle(/Pause/i)).toBeInTheDocument();
    expect(screen.getByTestId('animation-status')).toHaveTextContent('Playing');

    // 4. Click Pause and verify it changes back to Play
    await act(async () => {
      fireEvent.click(screen.getByTitle(/Pause/i).closest('button')!);
    });
    expect(screen.getByTitle(/Play/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Pause/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('animation-status')).toHaveTextContent('Paused');

    // 5. Click Speed toggle and verify it changes state (default is 4x, toggles to 8x)
    expect(screen.getByTestId('animation-speed')).toHaveTextContent('4x');
    await act(async () => {
      fireEvent.click(speedButton);
    });
    expect(screen.getByTestId('animation-speed')).toHaveTextContent('8x');

    // 6. Click Play again and verify it resumes
    await act(async () => {
      fireEvent.click(screen.getByTitle(/Play/i).closest('button')!);
    });
    expect(screen.getByTestId('animation-status')).toHaveTextContent('Playing');

    // 7. Wait for animation to complete and verify it stops
    await act(async () => {
      fireEvent.click(screen.getByTestId('complete-animation'));
    });
    expect(screen.getByTitle(/Play/i)).toBeInTheDocument();
    expect(screen.getByTestId('animation-status')).toHaveTextContent('Paused');
  });
});
