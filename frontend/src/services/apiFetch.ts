import { CONFIG } from '@/config';
import * as logger from '@/lib/logger';
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

  // Determine HTTP method
  let method = init.method;
  if (!method) {
    if (typeof input === 'string' || input instanceof URL) {
      method = 'GET';
    } else {
      method = input.method;
    }
  }
  method = method?.toUpperCase() ?? 'GET';

  const apiBase = (CONFIG.API_BASE_URL ?? '').replace(/\/$/, '');
  const isApiCall = url.startsWith('/') || (apiBase && url.startsWith(apiBase));

  if (isApiCall && !headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  logger.debug('services/apiFetch', 'request', { method, url });

  try {
    const response = await fetch(input, { ...init, headers });
    if (!response.ok) {
      logger.warn('services/apiFetch', 'non-ok response', { method, url, status: response.status });
    }
    return response;
  } catch (err) {
    logger.error('services/apiFetch', 'fetch failed', { method, url }, err);
    throw err;
  }
}

export default apiFetch;
