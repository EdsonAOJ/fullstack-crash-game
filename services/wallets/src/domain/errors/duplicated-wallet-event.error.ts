import { DomainError } from "./domain-error";

export class DuplicatedWalletEventError extends DomainError {
  constructor() {
    super("Event has already been processed by this wallet.");
    this.name = "DuplicatedWalletEventError";
  }
}
