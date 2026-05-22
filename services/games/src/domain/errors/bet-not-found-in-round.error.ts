import { DomainError } from "./domain-error";

export class BetNotFoundInRoundError extends DomainError {
  constructor() {
    super("Bet not found in round.");
    this.name = "BetNotFoundInRoundError";
  }
}
