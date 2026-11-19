import {
  ApiError,
  buildQueryString,
  getStoredToken,
  type ApiTransport,
  type HttpMethod,
  type RequestOptions,
} from './transport';

export function createHttpTransport(baseUrl: string): ApiTransport {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = getStoredToken();
    const headers = new Headers(options.headers);
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (!isFormData && body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const query = buildQueryString(options.params);
    const res = await fetch(`${baseUrl}${path}${query}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const parsed = text ? JSON.parse(text) : null;
        if (parsed?.error) message = parsed.error;
      } catch {
        if (text) message = text;
      }
      throw new ApiError(message, res.status);
    }

    if (options.responseType === 'text') return text as T;
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('PATCH', path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>('DELETE', path, undefined, options),
  };
}
