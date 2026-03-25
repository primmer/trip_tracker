import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Admin } from '../pages/Admin';
import { MemoryRouter } from 'react-router-dom';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock API base URL
vi.mock('../utils/api', () => ({
  getApiBaseUrl: () => 'http://localhost:5001',
}));

describe('Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for sync
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        activities_synced: 10,
        trips_created: 2,
        activities_saved: 8,
        activities_failed: 0,
        trips_saved: 2,
        trips_failed: 0,
        enhanced_count: 5
      }),
    } as unknown as Response);
  });

  it('renders admin dashboard correctly', () => {
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/strava synchronization/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full sync/i })).toBeInTheDocument();
  });

  it('triggers sync and shows progress and results', async () => {
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    const syncButton = screen.getByRole('button', { name: /full sync/i });
    fireEvent.click(syncButton);

    // Shows progress
    expect(screen.getAllByText(/syncing.../i).length).toBeGreaterThan(0);
    expect(screen.getByText(/full re-syncing all activities/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Shows results
    await waitFor(() => {
      expect(screen.getByText(/sync completed successfully/i)).toBeInTheDocument();
    });

    expect(screen.getByText('10')).toBeInTheDocument(); // activities_synced
    expect(screen.getByText('2')).toBeInTheDocument(); // trips_created
    expect(screen.getByText('5')).toBeInTheDocument(); // enhanced_count
  });

  it('shows error banner when sync fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Rate limit exceeded' }),
    } as unknown as Response);

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    const syncButton = screen.getByRole('button', { name: /full sync/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});
