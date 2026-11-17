"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTRPC } from "@/trpc/provider";

/** Refetches every bookings list and the open slots, whatever their input. */
export function useInvalidateBookings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.bookings.list.pathKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.slots.list.pathKey() }),
      ]),
    [queryClient, trpc],
  );
}
