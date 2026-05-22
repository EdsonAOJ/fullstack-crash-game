import { DomainError } from "./domain-error";

export class RoundNotAcceptingBetsError extends DomainError {
  constructor() {
    super("Round is not accepting bets.");
    this.name = "RoundNotAcceptingBetsError";
  }
}
