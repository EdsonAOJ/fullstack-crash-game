export const gameQueryKeys = {
  currentRound: ["game", "rounds", "current"] as const,
  roundHistory: ["game", "rounds", "history"] as const,
  leaderboard: ["game", "leaderboard"] as const,
  wallet: ["wallets", "me"] as const,
  myBets: ["game", "bets", "me"] as const,
  roundVerification: (roundId: string) =>
    ["game", "rounds", roundId, "verify"] as const,
};
