import { describe, expect, test } from "bun:test";
import { WalletNotFoundError } from "../../../src/application/errors/wallet-not-found.error";
import { DebitWalletUseCase } from "../../../src/application/use-cases/debit-wallet.use-case";
import { InsufficientBalanceError } from "../../../src/domain/errors/insufficient-balance.error";
import { Wallet } from "../../../src/domain/entities/wallet.entity";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { FixedClock, SequentialIdGenerator } from "./fakes";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";

describe("DebitWalletUseCase", () => {
  test("debits wallet balance", async () => {
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

    const useCase = new DebitWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    const output = await useCase.execute({
      playerId: "player-1",
      eventId: "event-1",
      amountCents: 300n,
      referenceType: "BET",
      referenceId: "bet-1",
    });

    expect(output).toEqual({
      walletId: "wallet-1",
      playerId: "player-1",
      balanceCents: "700",
    });

    const updatedWallet = await walletRepository.findByPlayerId("player-1");

    expect(updatedWallet).not.toBeNull();

    const snapshot = updatedWallet!.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(700n);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]).toMatchObject({
      id: "id-1",
      eventId: "event-1",
      type: "DEBIT",
      referenceType: "BET",
      referenceId: "bet-1",
      createdAt: clock.now(),
    });
    expect(snapshot.transactions[0].amount.toCents()).toBe(300n);
    expect(snapshot.transactions[0].balanceBefore.toCents()).toBe(1000n);
    expect(snapshot.transactions[0].balanceAfter.toCents()).toBe(700n);
  });

  test("throws when wallet does not exist", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const useCase = new DebitWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    await expect(
      useCase.execute({
        playerId: "player-1",
        eventId: "event-1",
        amountCents: 300n,
      }),
    ).rejects.toThrow(WalletNotFoundError);
  });

  test("throws when wallet balance is insufficient", async () => {
    const walletRepository = new InMemoryWalletRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(100n),
      now: clock.now(),
    });

    await walletRepository.save(wallet);

    const useCase = new DebitWalletUseCase(
      walletRepository,
      idGenerator,
      clock,
    );

    await expect(
      useCase.execute({
        playerId: "player-1",
        eventId: "event-1",
        amountCents: 300n,
        referenceType: "BET",
        referenceId: "bet-1",
      }),
    ).rejects.toThrow(InsufficientBalanceError);

    const updatedWallet = await walletRepository.findByPlayerId("player-1");

    expect(updatedWallet).not.toBeNull();
    expect(updatedWallet!.toSnapshot().balance.toCents()).toBe(100n);
    expect(updatedWallet!.toSnapshot().transactions).toHaveLength(0);
  });
});
