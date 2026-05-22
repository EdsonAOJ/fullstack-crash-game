import { DuplicatedWalletEventError } from "../errors/duplicated-wallet-event.error";
import { InsufficientBalanceError } from "../errors/insufficient-balance.error";
import { InvalidMoneyMovementError } from "../errors/invalid-money-movement.error";
import { Money } from "../value-objects/money.vo";

type WalletTransactionType = "CREDIT" | "DEBIT";

export interface WalletTransactionProps {
  id: string;
  eventId: string;
  type: WalletTransactionType;
  amount: Money;
  balanceBefore: Money;
  balanceAfter: Money;
  referenceType?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface WalletProps {
  id: string;
  playerId: string;
  balance: Money;
  transactions: WalletTransactionProps[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MoveMoneyInput {
  transactionId: string;
  eventId: string;
  amount: Money;
  referenceType?: string;
  referenceId?: string;
  occurredAt: Date;
}

export class Wallet {
  private readonly id: string;
  private readonly playerId: string;
  private balance: Money;
  private readonly transactions: WalletTransactionProps[];
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: WalletProps) {
    this.id = props.id;
    this.playerId = props.playerId;
    this.balance = props.balance;
    this.transactions = props.transactions;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    playerId: string;
    initialBalance?: Money;
    now: Date;
  }): Wallet {
    return new Wallet({
      id: props.id,
      playerId: props.playerId,
      balance: props.initialBalance ?? Money.zero(),
      transactions: [],
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static restore(props: WalletProps): Wallet {
    return new Wallet(props);
  }

  credit(input: MoveMoneyInput): void {
    this.ensurePositiveAmount(input.amount);
    this.ensureEventWasNotProcessed(input.eventId);

    const balanceBefore = this.balance;
    const balanceAfter = this.balance.add(input.amount);

    this.balance = balanceAfter;
    this.updatedAt = input.occurredAt;

    this.transactions.push({
      id: input.transactionId,
      eventId: input.eventId,
      type: "CREDIT",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdAt: input.occurredAt,
    });
  }

  debit(input: MoveMoneyInput): void {
    this.ensurePositiveAmount(input.amount);
    this.ensureEventWasNotProcessed(input.eventId);

    if (this.balance.isLessThan(input.amount)) {
      throw new InsufficientBalanceError();
    }

    const balanceBefore = this.balance;
    const balanceAfter = this.balance.subtract(input.amount);

    this.balance = balanceAfter;
    this.updatedAt = input.occurredAt;

    this.transactions.push({
      id: input.transactionId,
      eventId: input.eventId,
      type: "DEBIT",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdAt: input.occurredAt,
    });
  }

  private ensurePositiveAmount(amount: Money): void {
    if (amount.isZero()) {
      throw new InvalidMoneyMovementError();
    }
  }

  private ensureEventWasNotProcessed(eventId: string): void {
    const alreadyProcessed = this.transactions.some(
      (transaction) => transaction.eventId === eventId,
    );

    if (alreadyProcessed) {
      throw new DuplicatedWalletEventError();
    }
  }

  toSnapshot(): WalletProps {
    return {
      id: this.id,
      playerId: this.playerId,
      balance: this.balance,
      transactions: [...this.transactions],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
