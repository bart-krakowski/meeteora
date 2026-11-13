import {
  type Booking,
  type BookingIdRequest,
  type CreateBookingRequest,
  type CreateEventTypeRequest,
  type CreateResourceRequest,
  type EventType,
  type EventTypeIdRequest,
  type HealthResponse,
  type ListBookingsRequest,
  type ListSlotsRequest,
  type ListSlotsResponse,
  type Resource,
  type ResourceIdRequest,
  type RpcError,
  SchedulingPatterns,
  type UpdateResourceRequest,
} from "@meeteora/contracts";
import {
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout } from "rxjs";

export const SCHEDULING_SERVICE = Symbol("SCHEDULING_SERVICE");

const REQUEST_TIMEOUT_MS = 5000;

function isRpcError(error: unknown): error is RpcError {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as RpcError).status === "number" &&
    typeof (error as RpcError).message === "string"
  );
}

@Injectable()
export class SchedulingClient {
  @Inject(SCHEDULING_SERVICE)
  private readonly client: ClientProxy;

  health(): Promise<HealthResponse> {
    return this.send(SchedulingPatterns.health, {});
  }

  listSlots(request: ListSlotsRequest): Promise<ListSlotsResponse> {
    return this.send(SchedulingPatterns.listSlots, request);
  }

  createBooking(request: CreateBookingRequest): Promise<Booking> {
    return this.send(SchedulingPatterns.createBooking, request);
  }

  listBookings(request: ListBookingsRequest): Promise<Array<Booking>> {
    return this.send(SchedulingPatterns.listBookings, request);
  }

  getBooking(request: BookingIdRequest): Promise<Booking> {
    return this.send(SchedulingPatterns.getBooking, request);
  }

  cancelBooking(request: BookingIdRequest): Promise<Booking> {
    return this.send(SchedulingPatterns.cancelBooking, request);
  }

  listEventTypes(): Promise<Array<EventType>> {
    return this.send(SchedulingPatterns.listEventTypes, {});
  }

  createEventType(request: CreateEventTypeRequest): Promise<EventType> {
    return this.send(SchedulingPatterns.createEventType, request);
  }

  deleteEventType(request: EventTypeIdRequest): Promise<EventType> {
    return this.send(SchedulingPatterns.deleteEventType, request);
  }

  listResources(): Promise<Array<Resource>> {
    return this.send(SchedulingPatterns.listResources, {});
  }

  createResource(request: CreateResourceRequest): Promise<Resource> {
    return this.send(SchedulingPatterns.createResource, request);
  }

  updateResource(request: UpdateResourceRequest): Promise<Resource> {
    return this.send(SchedulingPatterns.updateResource, request);
  }

  deleteResource(request: ResourceIdRequest): Promise<Resource> {
    return this.send(SchedulingPatterns.deleteResource, request);
  }

  private async send<TResult>(
    pattern: string,
    payload: object,
  ): Promise<TResult> {
    try {
      return await firstValueFrom(
        this.client
          .send<TResult>(pattern, payload)
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
    } catch (error) {
      if (isRpcError(error))
        throw new HttpException(error.message, error.status);
      throw new ServiceUnavailableException(
        `Scheduling service failed on ${pattern}`,
        {
          cause: error,
        },
      );
    }
  }
}
