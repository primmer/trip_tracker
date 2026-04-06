const STORAGE_KEY = 'trip_tracker_admin';

export function checkAdminMode(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');

  if (adminParam === 'off') {
    sessionStorage.removeItem(STORAGE_KEY);
    // Clean the param from URL without reload
    params.delete('admin');
    const clean = params.toString();
    const newUrl = window.location.pathname + (clean ? `?${clean}` : '');
    window.history.replaceState({}, '', newUrl);
    return false;
  }

  if (adminParam) {
    const key = import.meta.env.VITE_ADMIN_KEY;
    if (key && adminParam === key) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      // Clean the param from URL without reload
      params.delete('admin');
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : '');
      window.history.replaceState({}, '', newUrl);
      return true;
    }
    return false;
  }

  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function isAdmin(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}
