import { createHmac, createHash, randomUUID } from "node:crypto";
import { Multiplier } from "../value-objects/multiplier.vo";
import { readPositiveNumberFromEnv } from "../../infrastructure/config/read-env";

export interface ProvablyFairRoundData {
  serverSeed: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  crashPoint: Multiplier;
}

export interface VerifyProvablyFairInput {
  serverSeed: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  crashPointMultiplier: number;
}

export interface VerifyProvablyFairOutput {
  isHashValid: boolean;
  calculatedCrashPoint: Multiplier;
  isCrashPointValid: boolean;
}

const DEFAULT_PUBLIC_SEED = "crash-game";
const HOUSE_EDGE_PERCENT = 1;

export class ProvablyFairService {
  private readonly maxCrashMultiplier = readPositiveNumberFromEnv(
    "GAME_MAX_CRASH_MULTIPLIER",
    20,
  );

  getMaxCrashMultiplier(): number {
    return this.maxCrashMultiplier;
  }

  generateRoundData(nonce: number): ProvablyFairRoundData {
    const serverSeed = randomUUID();
    const serverSeedHash = this.hashServerSeed(serverSeed);
    const crashPoint = this.calculateCrashPoint({
      serverSeed,
      publicSeed: DEFAULT_PUBLIC_SEED,
      nonce,
    });

    return {
      serverSeed,
      serverSeedHash,
      publicSeed: DEFAULT_PUBLIC_SEED,
      nonce,
      crashPoint,
    };
  }

  verify(input: VerifyProvablyFairInput): VerifyProvablyFairOutput {
    const calculatedServerSeedHash = this.hashServerSeed(input.serverSeed);

    const calculatedCrashPoint = this.calculateCrashPoint({
      serverSeed: input.serverSeed,
      publicSeed: input.publicSeed,
      nonce: input.nonce,
    });

    return {
      isHashValid: calculatedServerSeedHash === input.serverSeedHash,
      calculatedCrashPoint,
      isCrashPointValid:
        calculatedCrashPoint.toScaledInteger() === input.crashPointMultiplier,
    };
  }

  private hashServerSeed(serverSeed: string): string {
    return createHash("sha256").update(serverSeed).digest("hex");
  }

  private calculateCrashPoint(input: {
    serverSeed: string;
    publicSeed: string;
    nonce: number;
  }): Multiplier {
    const hmac = createHmac("sha256", input.serverSeed)
      .update(`${input.publicSeed}:${input.nonce}`)
      .digest("hex");

    const first52Bits = Number.parseInt(hmac.slice(0, 13), 16);
    const max52Bits = 2 ** 52;

    const randomRatio = first52Bits / max52Bits;

    const rawMultiplier =
      ((100 - HOUSE_EDGE_PERCENT) / 100) * (1 / (1 - randomRatio));

    const cappedMultiplier = Math.min(
      Math.max(rawMultiplier, 1),
      this.maxCrashMultiplier,
    );

    return Multiplier.fromNumber(cappedMultiplier);
  }
}
