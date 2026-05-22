import { DomainError } from "./domain-error";

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super("Insufficient wallet balance.");
    this.name = "InsufficientBalanceError";
  }
}
