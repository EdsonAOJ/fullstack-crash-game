import { DomainError } from "./domain-error";

export class RoundNotRunningError extends DomainError {
  constructor() {
    super("Round is not running.");
    this.name = "RoundNotRunningError";
  }
}
