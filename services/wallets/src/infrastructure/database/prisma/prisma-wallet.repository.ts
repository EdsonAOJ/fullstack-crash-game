import { Injectable } from "@nestjs/common";
import { Wallet } from "../../../domain/entities/wallet.entity";
import {
  WalletBusinessTransactionReference,
  WalletRepository,
} from "../../../application/ports/wallet.repository";
import { PrismaWalletMapper } from "./prisma-wallet.mapper";
import type { PrismaClientLike } from "./prisma-client";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async findById(id: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!wallet) {
      return null;
    }

    return PrismaWalletMapper.toDomain(wallet);
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
      include: {
        transactions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!wallet) {
      return null;
    }

    return PrismaWalletMapper.toDomain(wallet);
  }

  async existsTransactionByBusinessReference(
    reference: WalletBusinessTransactionReference,
  ): Promise<boolean> {
    const transaction = await this.prisma.walletTransaction.findFirst({
      where: {
        type: reference.type,
        referenceType: reference.referenceType,
        referenceId: reference.referenceId,
      },
      select: {
        id: true,
      },
    });

    return transaction !== null;
  }

  async save(wallet: Wallet): Promise<void> {
    const snapshot = wallet.toSnapshot();

    await this.prisma.wallet.upsert({
      where: {
        id: snapshot.id,
      },
      create: {
        id: snapshot.id,
        playerId: snapshot.playerId,
        balanceCents: snapshot.balance.toCents(),
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      update: {
        balanceCents: snapshot.balance.toCents(),
        updatedAt: snapshot.updatedAt,
      },
    });

    await this.prisma.walletTransaction.deleteMany({
      where: {
        walletId: snapshot.id,
      },
    });

    if (snapshot.transactions.length > 0) {
      await this.prisma.walletTransaction.createMany({
        data: snapshot.transactions.map((transaction) => ({
          id: transaction.id,
          walletId: snapshot.id,
          eventId: transaction.eventId,
          type: transaction.type,
          amountCents: transaction.amount.toCents(),
          balanceBefore: transaction.balanceBefore.toCents(),
          balanceAfter: transaction.balanceAfter.toCents(),
          referenceType: transaction.referenceType ?? null,
          referenceId: transaction.referenceId ?? null,
          createdAt: transaction.createdAt,
        })),
      });
    }
  }
}
