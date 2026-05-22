import { DomainError } from "./domain-error";

export class DuplicatedBetError extends DomainError {
  constructor() {
    super("Player already has a bet in this round.");
    this.name = "DuplicatedBetError";
  }
}
