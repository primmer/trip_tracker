export const getApiBaseUrl = () => {
  if (import.meta.env.MODE === 'development') {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  }
  return import.meta.env.VITE_API_BASE_URL || '';
};
