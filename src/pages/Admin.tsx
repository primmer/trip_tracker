import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';
import { ErrorBanner } from '../components/ErrorBanner';

interface SyncResult {
  activities_synced: number;
  trips_created: number;
  activities_saved: number;
  activities_failed: number;
  trips_saved: number;
  trips_failed: number;
  enhanced_count?: number;
}

export const Admin: React.FC = () => {
  const [syncing, setSyncing] = useState<false | 'quick' | 'full'>(false);
  const [syncStep, setSyncStep] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async (mode: 'quick' | 'full' = 'quick') => {
    setSyncing(mode);
    setSyncStep(
      mode === 'quick' ? 'Quick syncing new activities...' : 'Full re-syncing all activities...',
    );
    setSyncResult(null);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/strava/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Sync failed');
      }

      const data = await response.json();
      setSyncResult(data);
      setSyncStep(null);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync with Strava');
      setSyncStep(null);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Strava Synchronization</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-md">
              <strong className="text-gray-300">Quick Sync</strong> picks up new rides only.
              <br />
              <strong className="text-gray-300">Full Sync</strong> re-fetches all descriptions and
              re-groups all trips.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleSync('quick')}
              disabled={!!syncing}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all font-bold shadow-lg min-h-[44px] flex-1"
            >
              {syncing === 'quick' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>{syncing === 'quick' ? 'Syncing...' : 'Quick Sync'}</span>
            </button>
            <button
              onClick={() => handleSync('full')}
              disabled={!!syncing}
              className="flex items-center justify-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 border border-gray-600 disabled:bg-gray-800 transition-all font-bold shadow-lg min-h-[44px] flex-1"
            >
              {syncing === 'full' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>{syncing === 'full' ? 'Syncing...' : 'Full Sync'}</span>
            </button>
          </div>
        </div>

        {syncing && syncStep && (
          <div className="flex items-center gap-3 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-100 font-medium">{syncStep}</span>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {syncResult && (
          <div className="mt-6 bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-2 text-green-400 mb-4 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Sync Completed Successfully</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                  Activities Found
                </p>
                <p className="text-2xl font-bold text-white">{syncResult.activities_synced}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                  Trips Created
                </p>
                <p className="text-2xl font-bold text-white">{syncResult.trips_created}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                  Saved to DB
                </p>
                <p className="text-2xl font-bold text-white">{syncResult.activities_saved}</p>
              </div>
              {syncResult.enhanced_count !== undefined && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                    Titles Enhanced
                  </p>
                  <p className="text-2xl font-bold text-white">{syncResult.enhanced_count}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Strava API</span>
            <span className="text-green-400 flex items-center gap-1.5 text-sm font-bold">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Google Photos API</span>
            <span className="text-green-400 flex items-center gap-1.5 text-sm font-bold">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Google Maps API</span>
            <span className="text-green-400 flex items-center gap-1.5 text-sm font-bold">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
