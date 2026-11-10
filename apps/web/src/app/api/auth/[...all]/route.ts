const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:3003';

/** Hop-by-hop and recomputed headers that must not be copied across the proxy. */
const DROPPED_REQUEST_HEADERS = ['host', 'connection', 'content-length'];
const DROPPED_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

/**
 * Forwards `/api/auth/*` to the auth service so Better Auth cookies are set on
 * the web origin. Resolved at runtime (not a `next.config` rewrite) so
 * `AUTH_URL` can differ per deployment.
 */
async function proxy(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, AUTH_URL);

  const headers = new Headers(request.headers);
  for (const name of DROPPED_REQUEST_HEADERS) headers.delete(name);
  headers.set('x-forwarded-host', request.headers.get('host') ?? incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
    signal: request.signal,
  }).catch(() => undefined);

  if (!upstream) return new Response('Auth is unavailable', { status: 502 });

  const responseHeaders = new Headers(upstream.headers);
  for (const name of DROPPED_RESPONSE_HEADERS) responseHeaders.delete(name);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST };
