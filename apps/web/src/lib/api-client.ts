import 'server-only';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Minimal typed HTTP client for the internal API gateway.
 * Handles base URL, JSON encoding, query params, and uniform error shape.
 */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    /** Extra headers per request, e.g. the caller's cookie for authenticated routes. */
    private readonly requestHeaders: () => Promise<Record<string, string>> = async () => ({}),
  ) {}

  get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = this.url(path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    return this.request('GET', url);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request('POST', this.url(path), body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request('PATCH', this.url(path), body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request('DELETE', this.url(path));
  }

  private url(path: string): URL {
    return new URL(`${this.baseUrl}${path}`);
  }

  private async request<T>(
    method: string,
    url: URL,
    body?: unknown,
  ): Promise<T> {
    const headers = await this.requestHeaders();
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `${method} ${url.pathname} failed: ${response.status}`,
      );
    }
    return response.json() as Promise<T>;
  }
}
