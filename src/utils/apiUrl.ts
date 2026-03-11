const rawApiBaseUrl = process.env.VITE_API_BASE_URL || '/api';
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

export const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedApiBaseUrl || normalizedApiBaseUrl === '/api') {
    return normalizedPath;
  }

  if (normalizedApiBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedApiBaseUrl}${normalizedPath.slice('/api'.length)}`;
  }

  return `${normalizedApiBaseUrl}${normalizedPath}`;
};
