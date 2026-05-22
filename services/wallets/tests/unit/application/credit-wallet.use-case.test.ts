import { describe, expect, test } from "bun:test";
import { WalletNotFoundError } from "../../../src/application/errors/wallet-not-found.error";
import { CreditWalletUseCase } from "../../../src/application/use-cases/credit-wallet.use-case";
import { Wallet } from "../../../src/domain/entities/wallet.entity";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { FixedClock, SequentialIdGenerator } from "./fakes";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";

describe("CreditWalletUseCase", () => {
  test("credits wallet balance", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1000n),
      now: clock.now(),
    });

    await walletRepository.save(wallet);

    const useCase = new CreditWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    const output = await useCase.execute({
      playerId: "player-1",
      eventId: "event-1",
      amountCents: 500n,
      referenceType: "CASHOUT",
      referenceId: "bet-1",
    });

    expect(output).toEqual({
      walletId: "wallet-1",
      playerId: "player-1",
      balanceCents: "1500",
    });

    const updatedWallet = await walletRepository.findByPlayerId("player-1");

    expect(updatedWallet).not.toBeNull();

    const snapshot = updatedWallet!.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(1500n);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]).toMatchObject({
      id: "id-1",
      eventId: "event-1",
      type: "CREDIT",
      referenceType: "CASHOUT",
      referenceId: "bet-1",
      createdAt: clock.now(),
    });
    expect(snapshot.transactions[0].amount.toCents()).toBe(500n);
    expect(snapshot.transactions[0].balanceBefore.toCents()).toBe(1000n);
    expect(snapshot.transactions[0].balanceAfter.toCents()).toBe(1500n);
  });

  test("throws when wallet does not exist", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const useCase = new CreditWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    await expect(
      useCase.execute({
        playerId: "player-1",
        eventId: "event-1",
        amountCents: 500n,
      }),
    ).rejects.toThrow(WalletNotFoundError);
  });
});
