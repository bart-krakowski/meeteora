const NOTIFICATIONS_URL =
  process.env.NOTIFICATIONS_URL ?? 'http://localhost:3002';

export async function GET(request: Request): Promise<Response> {
  const lastEventId = request.headers.get('last-event-id');
  const upstream = await fetch(`${NOTIFICATIONS_URL}/notifications/stream`, {
    headers: lastEventId ? { 'last-event-id': lastEventId } : undefined,
    signal: request.signal,
    cache: 'no-store',
  }).catch(() => undefined);

  if (!upstream?.ok || !upstream.body) {
    return new Response('Notifications are unavailable', { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
