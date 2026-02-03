/**
 * Backend base url helper.
 *
 * IMPORTANT: This base MUST be reachable by the backend/model when used to build `image_url`.
 *
 * Priority:
 * 1) NEXT_PUBLIC_BACKEND_BASE_URL / NEXT_PUBLIC_BACKEND_URL (recommended for prod)
 * 2) (dev fallback) window.location.origin (only works if backend is same-origin)
 */

export function getBackendBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  if (fromEnv && typeof fromEnv === 'string') return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  // Server-side fallback (best-effort). In prod, callers should set NEXT_PUBLIC_BACKEND_BASE_URL.
  return 'http://localhost:11211';
}

export function joinBackendUrl(path: string): string {
  const base = getBackendBaseUrl();
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}
