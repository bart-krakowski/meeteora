import { Controller, Inject } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  type BookingRules,
  SchedulingPatterns,
  type UpdateBookingRulesRequest,
} from "@meeteora/contracts";
import { BookingRulesService } from "./booking-rules.service";

@Controller()
export class BookingRulesController {
  constructor(
    @Inject(BookingRulesService)
    private readonly bookingRules: BookingRulesService,
  ) {}

  @MessagePattern(SchedulingPatterns.getBookingRules)
  get(): Promise<BookingRules> {
    return this.bookingRules.get();
  }

  @MessagePattern(SchedulingPatterns.updateBookingRules)
  update(@Payload() request: UpdateBookingRulesRequest): Promise<BookingRules> {
    return this.bookingRules.update(request);
  }
}
