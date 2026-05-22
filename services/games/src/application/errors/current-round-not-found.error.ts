export class CurrentRoundNotFoundError extends Error {
  constructor() {
    super("Current round not found.");
    this.name = "CurrentRoundNotFoundError";
  }
}
