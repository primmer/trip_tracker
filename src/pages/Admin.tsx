import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';
import { ErrorBanner } from '../components/ErrorBanner';
import { logAdminSync } from '../utils/analytics';

interface SyncResult {
  activities_synced: number;
  trips_created: number;
  activities_saved: number;
  activities_failed: number;
  activities_excluded?: number;
  trips_saved: number;
  trips_failed: number;
  enhanced_count?: number;
}

interface CleanupResult {
  activities_checked: number;
  activities_excluded: number;
  activities_not_found: number;
  activities_deleted: number;
  delete_errors: number;
  trips_recreated: number;
  total_trips: number;
  photos_preserved?: number;
  deleted_activity_ids?: string[];
  not_found_in_strava_ids?: string[];
}

export const Admin: React.FC = () => {
  const [syncing, setSyncing] = useState<false | 'quick' | 'full'>(false);
  const [syncStep, setSyncStep] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const handleSync = async (mode: 'quick' | 'full' = 'quick') => {
    setSyncing(mode);
    setSyncStep(
      mode === 'quick' ? 'Quick syncing new activities...' : 'Full re-syncing all activities...',
    );
    setSyncResult(null);
    setCleanupResult(null);
    setError(null);

    // Log analytics
    logAdminSync('strava');

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

  const handleCleanup = async () => {
    setCleaning(true);
    setSyncStep('Checking for excluded activities...');
    setSyncResult(null);
    setCleanupResult(null);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/strava/cleanup-excluded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Cleanup failed');
      }

      const data = await response.json();
      setCleanupResult(data);
      setSyncStep(null);
    } catch (err) {
      console.error('Cleanup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to cleanup excluded activities');
      setSyncStep(null);
    } finally {
      setCleaning(false);
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
              {syncResult.activities_excluded !== undefined &&
                syncResult.activities_excluded > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                      Excluded
                    </p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {syncResult.activities_excluded}
                    </p>
                  </div>
                )}
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

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Cleanup Excluded Activities</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-md">
              Remove activities from Firestore that have the{' '}
              <code className="text-yellow-400 bg-gray-900 px-1 rounded">#no_triptracker_sync</code>{' '}
              hashtag. This fetches fresh data from Strava and deletes excluded activities.
            </p>
          </div>
          <button
            onClick={handleCleanup}
            disabled={cleaning || syncing !== false}
            className="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-6 py-3 rounded-lg disabled:bg-red-600/40 transition-all font-bold shadow-lg min-h-[44px]"
          >
            {cleaning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            <span>{cleaning ? 'Cleaning up...' : 'Run Cleanup'}</span>
          </button>
        </div>

        {cleanupResult && (
          <div className="mt-6 bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-2 text-green-400 mb-4 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Cleanup Completed Successfully</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Checked</p>
                <p className="text-2xl font-bold text-white">{cleanupResult.activities_checked}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                  Excluded
                </p>
                <p className="text-2xl font-bold text-yellow-400">
                  {cleanupResult.activities_excluded}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Deleted</p>
                <p className="text-2xl font-bold text-red-400">
                  {cleanupResult.activities_deleted}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                  Trips Recreated
                </p>
                <p className="text-2xl font-bold text-white">{cleanupResult.trips_recreated}</p>
              </div>
              {cleanupResult.photos_preserved !== undefined && (
                <div className="space-y-1">
                  <p className="text-xs text-green-500 uppercase tracking-widest font-bold">
                    Photos Preserved
                  </p>
                  <p className="text-2xl font-bold text-green-400">
                    {cleanupResult.photos_preserved}
                  </p>
                </div>
              )}
            </div>
            {(cleanupResult.activities_not_found > 0 || cleanupResult.delete_errors > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-6">
                  {cleanupResult.activities_not_found > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                        Not in Strava
                      </p>
                      <p className="text-xl font-bold text-orange-400">
                        {cleanupResult.activities_not_found}
                      </p>
                    </div>
                  )}
                  {cleanupResult.delete_errors > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                        Delete Errors
                      </p>
                      <p className="text-xl font-bold text-red-400">
                        {cleanupResult.delete_errors}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show deleted activity IDs */}
            {cleanupResult.not_found_in_strava_ids &&
              cleanupResult.not_found_in_strava_ids.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                    Not Found in Strava (deleted from Firestore):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cleanupResult.not_found_in_strava_ids.map((id) => (
                      <a
                        key={id}
                        href={`https://www.strava.com/activities/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-orange-900/50 text-orange-300 px-2 py-1 rounded hover:bg-orange-900/70 transition-colors"
                      >
                        {id}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {cleanupResult.deleted_activity_ids &&
              cleanupResult.deleted_activity_ids.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                    All Deleted Activity IDs:
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {cleanupResult.deleted_activity_ids.map((id) => (
                      <a
                        key={id}
                        href={`https://www.strava.com/activities/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                      >
                        {id}
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
