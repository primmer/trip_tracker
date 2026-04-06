import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Trips } from '../pages/Trips';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

vi.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  Mountain: () => <div data-testid="mountain-icon" />,
  Bike: () => <div data-testid="bike-icon" />,
}));

vi.mock('../components/RouteOverlay', () => ({
  RouteOverlay: () => <div data-testid="route-overlay" />,
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn(),
    where: vi.fn(),
    documentId: vi.fn(),
    limit: vi.fn(),
  };
});

const mockTrips = [
  {
    id: 'trip1',
    hashtag: 'hmb_jul4',
    name: 'hmb_jul4',
    dateRange: {
      start: '2026-07-04T08:00:00Z',
      end: '2026-07-05T16:00:00Z',
    },
    activityIds: [1, 2],
  },
  {
    id: 'trip2',
    hashtag: null,
    name: 'Morning Ride',
    dateRange: {
      start: '2026-03-15T10:00:00Z',
      end: '2026-03-15T10:00:00Z',
    },
    activityIds: [3],
  },
];

describe('Trips Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // getDocs is called multiple times: trips query first, then photos + stats per trip
    let callCount = 0;
    vi.mocked(firestore.getDocs).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: trips query
        return Promise.resolve({
          docs: mockTrips.map((trip) => ({
            id: trip.id,
            data: () => trip,
          })),
          empty: false,
        } as unknown as firestore.QuerySnapshot<firestore.DocumentData>);
      }
      // Subsequent calls: photos and stats queries return empty
      return Promise.resolve({
        docs: [],
        empty: true,
      } as unknown as firestore.QuerySnapshot<firestore.DocumentData>);
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    } as Response);
  });

  it('renders trip list correctly', async () => {
    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>,
    );

    // Should show loading initially
    expect(screen.getByRole('heading', { name: /trips/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Hmb Jul4')).toBeInTheDocument();
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
  });

  it('shows empty state when no trips exist', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValue({
      docs: [],
    } as unknown as firestore.QuerySnapshot<firestore.DocumentData>);

    render(
      <MemoryRouter>
        <Trips />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
    });
  });
});
