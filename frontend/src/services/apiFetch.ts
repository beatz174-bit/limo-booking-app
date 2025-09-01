import { CONFIG } from '@/config';
import { getAccessToken } from './tokenStore';

/**
 * Wrapper around fetch that attaches Authorization header for same-origin API calls.
 * If a token exists and the request targets the API base URL or a relative path,
 * it sets `Authorization: Bearer <token>` unless the header is already provided.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});

  // Determine request URL as string
  let url: string;
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input.url;
  }

  const apiBase = (CONFIG.API_BASE_URL ?? '').replace(/\/$/, '');
  const isApiCall = url.startsWith('/') || (apiBase && url.startsWith(apiBase));

  if (isApiCall && !headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(input, { ...init, headers });
}

export default apiFetch;
