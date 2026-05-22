export class LatestRoundNotFoundError extends Error {
  constructor() {
    super("Latest finished round not found.");
    this.name = "LatestRoundNotFoundError";
  }
}
