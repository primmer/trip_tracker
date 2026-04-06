import { render, screen, act, waitFor, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TripDetail } from '../TripDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import { Activity, Trip } from '../../types';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn((_db: unknown, col: string, id: string, ...rest: string[]) => ({
    id,
    path: [col, id, ...rest].join('/'),
  })),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  documentId: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  db: {},
}));

vi.mock('../../components/Map/TripMap', () => ({
  TripMap: () => <div data-testid="trip-map" />,
}));

vi.mock('../../components/ElevationChart', () => ({
  ElevationChart: () => <div data-testid="elevation-chart" />,
}));

vi.mock('../../utils/api', () => ({
  getApiBaseUrl: () => 'http://localhost:5001',
}));

vi.mock('../../utils/admin', () => ({
  isAdmin: () => true,
}));

const mockTrip: Trip = {
  id: 'headlands_overnighter',
  hashtag: 'headlands_overnighter',
  name: 'Headlands Overnighter',
  dateRange: { start: '2025-08-14', end: '2025-08-15' },
  activityIds: [100],
};

const mockActivity: Partial<Activity> = {
  id: 100,
  name: 'Evening Ride',
  distance: 4200,
  total_elevation_gain: 262,
  elapsed_time: 1620,
  start_date: '2025-08-14T02:00:00Z',
};

const mockStreamData = {
  latlng_json: JSON.stringify([
    [37.85, -122.52],
    [37.86, -122.53],
  ]),
  altitude_json: JSON.stringify([100, 300]),
  distance_json: JSON.stringify([0, 4200]),
  time_json: JSON.stringify([0, 1620]),
};

const mockPhoto = {
  id: 'photo-1',
  filename: 'PXL_20250814_sunset.jpg',
  downloadUrl: 'https://storage.example.com/photo1.jpg',
  lat: 37.855,
  lng: -122.525,
  createdAt: '2025-08-14T19:30:00Z',
};

function setupFirestoreMocks(opts: { withPhotos?: boolean } = {}) {
  vi.mocked(firestore.getDoc).mockImplementation((docRef: unknown) => {
    const ref = docRef as { path: string; id: string };
    if (ref.path?.includes('streams')) {
      return Promise.resolve({
        exists: () => true,
        id: 'data',
        data: () => mockStreamData,
      } as unknown as firestore.DocumentSnapshot);
    }
    return Promise.resolve({
      exists: () => true,
      id: 'headlands_overnighter',
      data: () => mockTrip,
    } as unknown as firestore.DocumentSnapshot);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vi.mocked(firestore.getDocs).mockImplementation((..._args) => {
    // After photos are processed, return photos on the second call pattern
    if (opts.withPhotos) {
      return Promise.resolve({
        docs: [
          { id: '100', data: () => mockActivity },
          { id: 'photo-1', data: () => mockPhoto },
        ],
        empty: false,
      } as unknown as firestore.QuerySnapshot);
    }
    return Promise.resolve({
      docs: [{ id: '100', data: () => mockActivity }],
      empty: false,
    } as unknown as firestore.QuerySnapshot);
  });
}

let mockPickerWindow: { closed: boolean; close: () => void };
let fetchMock: ReturnType<typeof vi.fn>;
let pollCount: number;
let mediaItemsReady: boolean;

function setupFetchMock() {
  pollCount = 0;
  mediaItemsReady = false;

  fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : '';

    // Health check
    if (urlStr.includes('/health')) {
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    }

    // Create picker session
    if (urlStr.includes('/api/photos/picker-session') && opts?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: 'test-session-123',
          pickerUri: 'https://photos.google.com/picker/test',
          mediaItemsSet: false,
        }),
        { status: 200 },
      );
    }

    // Poll session status
    if (urlStr.includes('/api/photos/picker-session/test-session-123') && !opts?.method) {
      pollCount++;
      return new Response(
        JSON.stringify({
          id: 'test-session-123',
          mediaItemsSet: mediaItemsReady,
          pollingConfig: { pollInterval: '5s', timeoutIn: '1800s' },
        }),
        { status: 200 },
      );
    }

    // Process session
    if (urlStr.includes('/api/photos/process-session')) {
      return new Response(
        JSON.stringify({
          processed: 1,
          details: [{ id: 'photo-1', success: true }],
        }),
        { status: 200 },
      );
    }

    // Streams fallback
    if (urlStr.includes('/api/activities/')) {
      return new Response('Not found', { status: 404 });
    }

    return new Response('Not found', { status: 404 });
  });

  global.fetch = fetchMock as unknown as typeof fetch;
}

function setupWindowOpen() {
  mockPickerWindow = {
    closed: false,
    close: () => {
      mockPickerWindow.closed = true;
    },
  };
  vi.spyOn(window, 'open').mockReturnValue(mockPickerWindow as unknown as Window);
}

async function renderTripDetail(): Promise<RenderResult> {
  let result: RenderResult = {} as RenderResult;
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={['/trip/headlands_overnighter']}>
        <Routes>
          <Route path="/trip/:tripId" element={<TripDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return result;
}

describe('TripDetail Photo Picker Flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupFirestoreMocks();
    setupFetchMock();
    setupWindowOpen();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('full picker flow: create session → poll → process → photos appear', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderTripDetail();

    // Trip should be loaded
    await waitFor(() => {
      expect(screen.getByText(/headlands overnighter/i)).toBeInTheDocument();
    });

    // Click Add Photos
    const addButton = screen.getByRole('button', { name: /add photos/i });
    await user.click(addButton);

    // Should hit health check then create session
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/photos/picker-session'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    // Picker window should have opened
    expect(window.open).toHaveBeenCalledWith(
      'https://photos.google.com/picker/test',
      'Google Photos Picker',
      expect.any(String),
    );

    // Should show "Waiting for selection..."
    await waitFor(() => {
      expect(screen.getByText(/Waiting for selection/i)).toBeInTheDocument();
    });

    // Simulate: user selects photos and clicks Done, then closes popup
    mediaItemsReady = true;
    mockPickerWindow.closed = true;

    // Advance timer to trigger poll
    await act(async () => {
      vi.advanceTimersByTime(5500);
    });

    // Should detect mediaItemsSet and process
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/photos/process-session'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    // Should show "Done!" briefly
    await waitFor(() => {
      expect(screen.getByText(/Done!/i)).toBeInTheDocument();
    });
  });

  it('keeps polling after popup closes until Google confirms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderTripDetail();

    await waitFor(() => {
      expect(screen.getByText(/headlands overnighter/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add photos/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Waiting for selection/i)).toBeInTheDocument();
    });

    // User closes popup but Google hasn't confirmed yet
    mockPickerWindow.closed = true;

    // Advance through several polls -- mediaItemsSet is still false
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5500);
      });
    }

    // Should still be polling (showing waiting message, not timed out)
    await waitFor(() => {
      expect(screen.getByText(/Waiting for Google to confirm/i)).toBeInTheDocument();
    });
    expect(pollCount).toBeGreaterThanOrEqual(5);

    // Now Google confirms
    mediaItemsReady = true;
    await act(async () => {
      vi.advanceTimersByTime(5500);
    });

    // Should process and complete
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/photos/process-session'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('shows error when backend is not running', async () => {
    // Override fetch to fail health check
    global.fetch = vi.fn(async () => {
      throw new Error('Connection refused');
    }) as unknown as typeof fetch;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderTripDetail();

    await waitFor(() => {
      expect(screen.getByText(/headlands overnighter/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add photos/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Backend server not running/i)).toBeInTheDocument();
    });
  });

  it('shows error when popup is blocked', async () => {
    // Override window.open to return null (popup blocked)
    vi.spyOn(window, 'open').mockReturnValue(null);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderTripDetail();

    await waitFor(() => {
      expect(screen.getByText(/headlands overnighter/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add photos/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/enable popups/i)).toBeInTheDocument();
    });
  });
});
