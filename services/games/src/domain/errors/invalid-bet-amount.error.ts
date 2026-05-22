import { DomainError } from "./domain-error";

export class InvalidBetAmountError extends DomainError {
  constructor() {
    super("Bet amount must be between 1.00 and 1000.00.");
    this.name = "InvalidBetAmountError";
  }
}
