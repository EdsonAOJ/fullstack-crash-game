import { describe, expect, test } from "bun:test";
import { CreateWalletUseCase } from "../../../src/application/use-cases/create-wallet.use-case";
import { WalletAlreadyExistsError } from "../../../src/application/errors/wallet-already-exists.error";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";
import { FixedClock, SequentialIdGenerator } from "./fakes";

describe("CreateWalletUseCase", () => {
  test("creates a wallet for a player", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const useCase = new CreateWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    const output = await useCase.execute({
      playerId: "player-1",
    });

    expect(output).toEqual({
      id: "id-1",
      playerId: "player-1",
      balanceCents: "0",
    });

    expect(walletRepository.wallets).toHaveLength(1);
  });

  test("does not create duplicated wallet for the same player", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const useCase = new CreateWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    await useCase.execute({
      playerId: "player-1",
    });

    await expect(
      useCase.execute({
        playerId: "player-1",
      }),
    ).rejects.toThrow(WalletAlreadyExistsError);

    expect(walletRepository.wallets).toHaveLength(1);
  });
});
