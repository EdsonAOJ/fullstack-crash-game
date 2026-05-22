import { ProvablyFairService } from "../../domain/services/provably-fair.service";
import { RoundNotFoundError } from "../errors/round-not-found.error";
import type { RoundRepository } from "../ports/round.repository";

export interface GetRoundVerifyInput {
  roundId: string;
}

export interface GetRoundVerifyOutput {
  roundId: string;
  status: string;
  algorithm: "HMAC_SHA256";
  serverSeed?: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  crashPoint?: number;
  crashPointMultiplier?: number;
  calculatedCrashPoint?: number;
  calculatedCrashPointMultiplier?: number;
  isHashValid?: boolean;
  isCrashPointValid?: boolean;
  isRevealed: boolean;
}

export class GetRoundVerifyUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async execute(input: GetRoundVerifyInput): Promise<GetRoundVerifyOutput> {
    const round = await this.roundRepository.findById(input.roundId);

    if (!round) {
      throw new RoundNotFoundError(input.roundId);
    }

    const snapshot = round.toSnapshot();

    const isRevealed =
      snapshot.status === "CRASHED" || snapshot.status === "COMPLETED";

    if (!isRevealed) {
      return {
        roundId: snapshot.id,
        status: snapshot.status,
        algorithm: "HMAC_SHA256",
        serverSeedHash: snapshot.serverSeedHash,
        publicSeed: snapshot.publicSeed,
        nonce: snapshot.nonce,
        isRevealed: false,
      };
    }

    const verification = this.provablyFairService.verify({
      serverSeed: snapshot.serverSeed,
      serverSeedHash: snapshot.serverSeedHash,
      publicSeed: snapshot.publicSeed,
      nonce: snapshot.nonce,
      crashPointMultiplier: snapshot.crashPoint.toScaledInteger(),
    });

    return {
      roundId: snapshot.id,
      status: snapshot.status,
      algorithm: "HMAC_SHA256",
      serverSeed: snapshot.serverSeed,
      serverSeedHash: snapshot.serverSeedHash,
      publicSeed: snapshot.publicSeed,
      nonce: snapshot.nonce,
      crashPoint: snapshot.crashPoint.toNumber(),
      crashPointMultiplier: snapshot.crashPoint.toScaledInteger(),
      calculatedCrashPoint: verification.calculatedCrashPoint.toNumber(),
      calculatedCrashPointMultiplier:
        verification.calculatedCrashPoint.toScaledInteger(),
      isHashValid: verification.isHashValid,
      isCrashPointValid: verification.isCrashPointValid,
      isRevealed: true,
    };
  }
}
