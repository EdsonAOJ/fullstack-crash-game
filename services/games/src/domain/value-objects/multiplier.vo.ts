import { DomainError } from "../errors/domain-error";

export class Multiplier {
  private constructor(private readonly value: number) {}

  static fromNumber(value: number): Multiplier {
    if (!Number.isFinite(value) || value < 1) {
      throw new DomainError("Multiplier must be greater than or equal to 1.");
    }

    return new Multiplier(Number(value.toFixed(2)));
  }

  static fromScaledInteger(value: number): Multiplier {
    return Multiplier.fromNumber(value / 100);
  }

  static initial(): Multiplier {
    return new Multiplier(1);
  }

  isGreaterThanOrEqual(other: Multiplier): boolean {
    return this.value >= other.value;
  }

  toNumber(): number {
    return this.value;
  }

  toScaledInteger(): number {
    return Math.floor(this.value * 100);
  }
}
