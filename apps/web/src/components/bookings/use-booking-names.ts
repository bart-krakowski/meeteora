"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/trpc/provider";

/** Event type and resource names by id, for labelling bookings. */
export function useBookingNames() {
  const trpc = useTRPC();
  const { data: eventTypes } = useSuspenseQuery(trpc.eventTypes.list.queryOptions());
  const { data: resources } = useSuspenseQuery(trpc.resources.list.queryOptions());
  const eventTypeNames = useMemo(
    () => new Map(eventTypes.map((eventType) => [eventType.id, eventType.name])),
    [eventTypes],
  );
  const resourceNames = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  );
  return { eventTypeNames, resourceNames };
}
