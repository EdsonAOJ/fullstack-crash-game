export class RoundNotFoundError extends Error {
  constructor(roundId: string) {
    super(`Round ${roundId} not found.`);
    this.name = "RoundNotFoundError";
  }
}
