'use server';

import { revalidatePath } from 'next/cache';
import { cancelBooking } from '@/lib/api';

export async function cancelBookingAction(formData: FormData) {
  const id = formData.get('id');
  if (typeof id !== 'string') throw new Error('Booking id is required');
  await cancelBooking(id);
  revalidatePath('/');
}
