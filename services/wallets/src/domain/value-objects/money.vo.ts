import { DomainError } from "../errors/domain-error";

export class Money {
  private constructor(private readonly cents: bigint) {}

  static fromCents(cents: bigint): Money {
    if (cents < 0n) {
      throw new DomainError("Money amount cannot be negative.");
    }

    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0n);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    const result = this.cents - other.cents;

    if (result < 0n) {
      throw new DomainError("Money amount cannot become negative.");
    }

    return new Money(result);
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  toCents(): bigint {
    return this.cents;
  }

  toJSON(): string {
    return this.cents.toString();
  }
}
