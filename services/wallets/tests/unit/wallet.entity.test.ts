import { describe, expect, test } from "bun:test";
import { Wallet } from "../../src/domain/entities/wallet.entity";
import { DuplicatedWalletEventError } from "../../src/domain/errors/duplicated-wallet-event.error";
import { InsufficientBalanceError } from "../../src/domain/errors/insufficient-balance.error";
import { InvalidMoneyMovementError } from "../../src/domain/errors/invalid-money-movement.error";
import { Money } from "../../src/domain/value-objects/money.vo";

const fixedDate = new Date("2026-01-01T00:00:00.000Z");

describe("Wallet entity", () => {
  test("creates a wallet with zero balance by default", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      now: fixedDate,
    });

    const snapshot = wallet.toSnapshot();

    expect(snapshot.playerId).toBe("player-1");
    expect(snapshot.balance.toCents()).toBe(0n);
    expect(snapshot.transactions).toHaveLength(0);
    expect(snapshot.createdAt).toEqual(fixedDate);
    expect(snapshot.updatedAt).toEqual(fixedDate);
  });

  test("credits money to wallet", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      now: fixedDate,
    });

    wallet.credit({
      transactionId: "transaction-1",
      eventId: "event-1",
      amount: Money.fromCents(1000n),
      referenceType: "SEED",
      referenceId: "seed-1",
      occurredAt: fixedDate,
    });

    const snapshot = wallet.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(1000n);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0].id).toBe("transaction-1");
    expect(snapshot.transactions[0].type).toBe("CREDIT");
    expect(snapshot.transactions[0].balanceBefore.toCents()).toBe(0n);
    expect(snapshot.transactions[0].balanceAfter.toCents()).toBe(1000n);
  });

  test("debits money from wallet", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1000n),
      now: fixedDate,
    });

    wallet.debit({
      transactionId: "transaction-1",
      eventId: "event-1",
      amount: Money.fromCents(300n),
      referenceType: "BET",
      referenceId: "bet-1",
      occurredAt: fixedDate,
    });

    const snapshot = wallet.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(700n);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0].id).toBe("transaction-1");
    expect(snapshot.transactions[0].type).toBe("DEBIT");
    expect(snapshot.transactions[0].balanceBefore.toCents()).toBe(1000n);
    expect(snapshot.transactions[0].balanceAfter.toCents()).toBe(700n);
  });

  test("does not allow debit when balance is insufficient", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(100n),
      now: fixedDate,
    });

    expect(() =>
      wallet.debit({
        transactionId: "transaction-1",
        eventId: "event-1",
        amount: Money.fromCents(200n),
        occurredAt: fixedDate,
      }),
    ).toThrow(InsufficientBalanceError);

    expect(wallet.toSnapshot().balance.toCents()).toBe(100n);
  });

  test("does not allow zero amount movement", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      now: fixedDate,
    });

    expect(() =>
      wallet.credit({
        transactionId: "transaction-1",
        eventId: "event-1",
        amount: Money.zero(),
        occurredAt: fixedDate,
      }),
    ).toThrow(InvalidMoneyMovementError);
  });

  test("does not process the same event twice", () => {
    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1000n),
      now: fixedDate,
    });

    wallet.debit({
      transactionId: "transaction-1",
      eventId: "event-1",
      amount: Money.fromCents(100n),
      occurredAt: fixedDate,
    });

    expect(() =>
      wallet.debit({
        transactionId: "transaction-2",
        eventId: "event-1",
        amount: Money.fromCents(100n),
        occurredAt: fixedDate,
      }),
    ).toThrow(DuplicatedWalletEventError);

    expect(wallet.toSnapshot().balance.toCents()).toBe(900n);
    expect(wallet.toSnapshot().transactions).toHaveLength(1);
  });
});
