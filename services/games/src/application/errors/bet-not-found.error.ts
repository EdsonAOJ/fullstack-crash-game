export class BetNotFoundError extends Error {
  constructor(referenceId: string) {
    super(`Bet not found for reference ${referenceId}.`);
    this.name = "BetNotFoundError";
  }
}
