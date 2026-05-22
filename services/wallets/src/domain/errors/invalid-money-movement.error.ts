import { DomainError } from "./domain-error";

export class InvalidMoneyMovementError extends DomainError {
  constructor() {
    super("Money movement amount must be greater than zero.");
    this.name = "InvalidMoneyMovementError";
  }
}
