import { describe, expect, test } from "bun:test";
import { WalletNotFoundError } from "../../../src/application/errors/wallet-not-found.error";
import { GetWalletByPlayerUseCase } from "../../../src/application/use-cases/get-wallet-by-player.use-case";
import { Wallet } from "../../../src/domain/entities/wallet.entity";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";

describe("GetWalletByPlayerUseCase", () => {
  test("returns wallet by player id", async () => {
    const walletRepository = new InMemoryWalletRepository();

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1500n),
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    await walletRepository.save(wallet);

    const useCase = new GetWalletByPlayerUseCase(walletRepository);

    const output = await useCase.execute({
      playerId: "player-1",
    });

    expect(output).toEqual({
      id: "wallet-1",
      playerId: "player-1",
      balanceCents: "1500",
    });
  });

  test("throws when wallet does not exist", async () => {
    const walletRepository = new InMemoryWalletRepository();

    const useCase = new GetWalletByPlayerUseCase(walletRepository);

    await expect(
      useCase.execute({
        playerId: "player-1",
      }),
    ).rejects.toThrow(WalletNotFoundError);
  });
});
