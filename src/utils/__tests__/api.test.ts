import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl } from '../api';

describe('getApiBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns localhost in development mode when VITE_API_BASE_URL is completely undefined', () => {
    vi.stubEnv('MODE', 'development');

    expect(getApiBaseUrl()).toBe('http://localhost:5001');
  });

  it('returns localhost in development mode when VITE_API_BASE_URL is an empty string', () => {
    vi.stubEnv('MODE', 'development');
    // We shouldn't strictly need to delete it since vitest starts cleanish,
    // but just to be sure we can set it to an empty string to simulate not set
    // In vitest's vi.stubEnv we can remove by stubbing to undefined or empty
    vi.stubEnv('VITE_API_BASE_URL', '');

    expect(getApiBaseUrl()).toBe('http://localhost:5001');
  });

  it('returns custom URL in development mode when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_API_BASE_URL', 'http://custom:5001');

    expect(getApiBaseUrl()).toBe('http://custom:5001');
  });

  it('returns empty string in production mode when VITE_API_BASE_URL is completely undefined', () => {
    vi.stubEnv('MODE', 'production');

    expect(getApiBaseUrl()).toBe('');
  });

  it('returns empty string in production mode when VITE_API_BASE_URL is an empty string', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_API_BASE_URL', '');

    expect(getApiBaseUrl()).toBe('');
  });

  it('returns custom URL in production mode when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.custom.com');

    expect(getApiBaseUrl()).toBe('https://api.custom.com');
  });
});
