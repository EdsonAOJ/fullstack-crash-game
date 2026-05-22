import {
  Wallet,
  WalletProps,
  WalletTransactionProps,
} from "../../../domain/entities/wallet.entity";
import { Money } from "../../../domain/value-objects/money.vo";

interface PrismaWalletModel {
  id: string;
  playerId: string;
  balanceCents: bigint;
  createdAt: Date;
  updatedAt: Date;
  transactions: PrismaWalletTransactionModel[];
}

interface PrismaWalletTransactionModel {
  id: string;
  eventId: string;
  type: "CREDIT" | "DEBIT";
  amountCents: bigint;
  balanceBefore: bigint;
  balanceAfter: bigint;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
}

export class PrismaWalletMapper {
  static toDomain(model: PrismaWalletModel): Wallet {
    const transactions: WalletTransactionProps[] = model.transactions.map(
      (transaction) => ({
        id: transaction.id,
        eventId: transaction.eventId,
        type: transaction.type,
        amount: Money.fromCents(transaction.amountCents),
        balanceBefore: Money.fromCents(transaction.balanceBefore),
        balanceAfter: Money.fromCents(transaction.balanceAfter),
        referenceType: transaction.referenceType ?? undefined,
        referenceId: transaction.referenceId ?? undefined,
        createdAt: transaction.createdAt,
      }),
    );

    const props: WalletProps = {
      id: model.id,
      playerId: model.playerId,
      balance: Money.fromCents(model.balanceCents),
      transactions,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };

    return Wallet.restore(props);
  }
}
