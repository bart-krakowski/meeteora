import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type Booking,
  type BookingIdRequest,
  type CreateBookingRequest,
  type ListBookingsRequest,
  SchedulingPatterns,
} from '@meeteora/contracts';
import { BookingsService } from './bookings.service';

@Controller()
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookings: BookingsService) {}

  @MessagePattern(SchedulingPatterns.createBooking)
  create(@Payload() request: CreateBookingRequest): Promise<Booking> {
    return this.bookings.create(request);
  }

  @MessagePattern(SchedulingPatterns.listBookings)
  list(@Payload() request: ListBookingsRequest): Promise<Array<Booking>> {
    return this.bookings.list(request);
  }

  @MessagePattern(SchedulingPatterns.getBooking)
  get(@Payload() request: BookingIdRequest): Promise<Booking> {
    return this.bookings.get(request);
  }

  @MessagePattern(SchedulingPatterns.cancelBooking)
  cancel(@Payload() request: BookingIdRequest): Promise<Booking> {
    return this.bookings.cancel(request);
  }
}
