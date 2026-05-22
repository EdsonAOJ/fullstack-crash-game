import { DomainError } from "./domain-error";

export class CashoutNotAllowedError extends DomainError {
  constructor() {
    super("Cashout is not allowed for this bet.");
    this.name = "CashoutNotAllowedError";
  }
}
