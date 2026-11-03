import type { Booking } from '@scheduler/contracts';
import type { GenerateSlotsResult } from '@tanstack/time';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function fetchSlots(): Promise<GenerateSlotsResult> {
  const response = await fetch(`${API_URL}/slots`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`GET /slots failed: ${response.status}`);
  return response.json();
}

export async function fetchBookings(from: Date): Promise<Array<Booking>> {
  const response = await fetch(
    `${API_URL}/bookings?from=${encodeURIComponent(from.toISOString())}`,
    {
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error(`GET /bookings failed: ${response.status}`);
  return response.json();
}

export async function cancelBooking(id: string): Promise<Booking> {
  const response = await fetch(
    `${API_URL}/bookings/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
  if (!response.ok)
    throw new Error(`DELETE /bookings/${id} failed: ${response.status}`);
  return response.json();
}
