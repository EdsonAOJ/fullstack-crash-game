import { Clock } from "../../../src/application/ports/clock";
import { IdGenerator } from "../../../src/application/ports/id-generator";

export class FixedClock implements Clock {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private current = 0;

  generate(): string {
    this.current += 1;
    return `id-${this.current}`;
  }
}
