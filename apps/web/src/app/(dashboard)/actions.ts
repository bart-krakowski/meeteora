"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/trpc/server";

export async function createEventTypeAction(formData: FormData) {
  const name = formData.get("name");
  const durationMinutes = Number(formData.get("durationMinutes"));
  if (typeof name !== "string" || !name.trim())
    throw new Error("Name is required");
  if (!Number.isInteger(durationMinutes))
    throw new Error("Duration is required");
  await api.eventTypes.create({ name, durationMinutes });
  revalidatePath("/events");
}

export async function deleteEventTypeAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Event type id is required");
  await api.eventTypes.delete({ id });
  revalidatePath("/events");
}

export async function cancelBookingAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Booking id is required");
  await api.bookings.cancel({ id });
  revalidatePath("/");
  revalidatePath("/bookings");
}

const FAKE_ATTENDEES = [
  { name: "Ada Lovelace", email: "ada@example.com" },
  { name: "Alan Turing", email: "alan@example.com" },
  { name: "Grace Hopper", email: "grace@example.com" },
  { name: "Katherine Johnson", email: "katherine@example.com" },
  { name: "Linus Torvalds", email: "linus@example.com" },
];

function pick<T>(items: Array<T>): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Dev-only: book a random open slot with a fake attendee. */
export async function simulateBookingAction() {
  const { slots } = await api.slots.list();
  const slot = pick(slots);
  if (!slot) throw new Error("No open slots to book");
  await api.bookings.create({
    ruleId: slot.ruleId,
    start: slot.start,
    attendee: pick(FAKE_ATTENDEES),
  });
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}

/** Dev-only: cancel a random confirmed booking. */
export async function simulateCancellationAction() {
  const bookings = await api.bookings.list();
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const booking = pick(confirmed);
  if (!booking) return;
  await api.bookings.cancel({ id: booking.id });
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}
