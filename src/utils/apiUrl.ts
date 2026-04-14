const rawApiBaseUrl = process.env.VITE_API_BASE_URL || '/api';
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

const FORCE_SAME_ORIGIN_HOSTS = new Set([
  'heartland-care-compass.vercel.app',
]);

const shouldForceSameOriginApi = (): boolean => {
  if (typeof window === 'undefined') return false;
  return FORCE_SAME_ORIGIN_HOSTS.has(window.location.hostname);
};

export const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (shouldForceSameOriginApi()) {
    return normalizedPath;
  }

  if (!normalizedApiBaseUrl || normalizedApiBaseUrl === '/api') {
    return normalizedPath;
  }

  if (normalizedApiBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedApiBaseUrl}${normalizedPath.slice('/api'.length)}`;
  }

  return `${normalizedApiBaseUrl}${normalizedPath}`;
};
