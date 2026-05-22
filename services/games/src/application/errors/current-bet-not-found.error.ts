export class CurrentBetNotFoundError extends Error {
  constructor(playerId: string) {
    super(`Current bet not found for player ${playerId}.`);
    this.name = "CurrentBetNotFoundError";
  }
}
