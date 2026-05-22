import { describe, expect, test } from "bun:test";
import { ProvablyFairService } from "../../src/domain/services/provably-fair.service";

describe("ProvablyFairService", () => {
  test("generates deterministic verification data", () => {
    const service = new ProvablyFairService();

    const roundData = service.generateRoundData(1);

    const verification = service.verify({
      serverSeed: roundData.serverSeed,
      serverSeedHash: roundData.serverSeedHash,
      publicSeed: roundData.publicSeed,
      nonce: roundData.nonce,
      crashPointMultiplier: roundData.crashPoint.toScaledInteger(),
    });

    expect(verification.isHashValid).toBe(true);
    expect(verification.isCrashPointValid).toBe(true);
    expect(verification.calculatedCrashPoint.toScaledInteger()).toBe(
      roundData.crashPoint.toScaledInteger(),
    );
  });

  test("detects invalid server seed hash", () => {
    const service = new ProvablyFairService();

    const roundData = service.generateRoundData(1);

    const verification = service.verify({
      serverSeed: roundData.serverSeed,
      serverSeedHash: "invalid-hash",
      publicSeed: roundData.publicSeed,
      nonce: roundData.nonce,
      crashPointMultiplier: roundData.crashPoint.toScaledInteger(),
    });

    expect(verification.isHashValid).toBe(false);
    expect(verification.isCrashPointValid).toBe(true);
  });

  test("detects invalid crash point", () => {
    const service = new ProvablyFairService();

    const roundData = service.generateRoundData(1);

    const verification = service.verify({
      serverSeed: roundData.serverSeed,
      serverSeedHash: roundData.serverSeedHash,
      publicSeed: roundData.publicSeed,
      nonce: roundData.nonce,
      crashPointMultiplier: roundData.crashPoint.toScaledInteger() + 1,
    });

    expect(verification.isHashValid).toBe(true);
    expect(verification.isCrashPointValid).toBe(false);
  });
});
