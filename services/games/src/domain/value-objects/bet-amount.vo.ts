import { InvalidBetAmountError } from "../errors/invalid-bet-amount.error";

export class BetAmount {
  static readonly MIN_CENTS = 100n;
  static readonly MAX_CENTS = 100000n;

  private constructor(private readonly cents: bigint) {}

  static fromCents(cents: bigint): BetAmount {
    if (cents < BetAmount.MIN_CENTS || cents > BetAmount.MAX_CENTS) {
      throw new InvalidBetAmountError();
    }

    return new BetAmount(cents);
  }

  toCents(): bigint {
    return this.cents;
  }

  toJSON(): string {
    return this.cents.toString();
  }
}
