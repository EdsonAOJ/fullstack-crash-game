import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../../application/ports/round.repository";
import { Round } from "../../../domain/entities/round.entity";
import { PrismaRoundMapper } from "./prisma-round.mapper";
import type { PrismaClientLike } from "./prisma-client";
import { BetProps } from "@/domain/entities/bet.entity";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async findBetsByPlayerId(params: {
    playerId: string;
    limit: number;
  }): Promise<BetProps[]> {
    const bets = await this.prisma.bet.findMany({
      where: {
        playerId: params.playerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: params.limit,
    });

    return bets.map((bet) => PrismaRoundMapper.betToDomainProps(bet));
  }

  async findByBetId(betId: string): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        bets: {
          some: {
            id: betId,
          },
        },
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!round) {
      return null;
    }

    return PrismaRoundMapper.toDomain(round);
  }

  async findHistory(params: { limit: number }): Promise<Round[]> {
    const rounds = await this.prisma.round.findMany({
      where: {
        status: {
          in: ["CRASHED", "COMPLETED"],
        },
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: params.limit,
    });

    return rounds.map((round) => PrismaRoundMapper.toDomain(round));
  }

  async findLatestFinished(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: ["CRASHED", "COMPLETED"],
        },
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!round) {
      return null;
    }

    return PrismaRoundMapper.toDomain(round);
  }

  async findLatestCrashed(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        status: "CRASHED",
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        crashedAt: "desc",
      },
    });

    if (!round) {
      return null;
    }

    return PrismaRoundMapper.toDomain(round);
  }

  async findCurrent(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: ["WAITING_FOR_BETS", "RUNNING"],
        },
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!round) {
      return null;
    }

    return PrismaRoundMapper.toDomain(round);
  }

  async findById(id: string): Promise<Round | null> {
    const round = await this.prisma.round.findUnique({
      where: {
        id,
      },
      include: {
        bets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!round) {
      return null;
    }

    return PrismaRoundMapper.toDomain(round);
  }

  async save(round: Round): Promise<void> {
    const snapshot = round.toSnapshot();

    await this.prisma.round.upsert({
      where: {
        id: snapshot.id,
      },
      create: {
        id: snapshot.id,
        status: snapshot.status,
        crashPointMultiplier: snapshot.crashPoint.toScaledInteger(),
        currentMultiplier: snapshot.currentMultiplier.toScaledInteger(),
        startsAt: snapshot.startsAt,
        startedAt: snapshot.startedAt,
        crashedAt: snapshot.crashedAt,
        completedAt: snapshot.completedAt,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        serverSeed: snapshot.serverSeed,
        serverSeedHash: snapshot.serverSeedHash,
        publicSeed: snapshot.publicSeed,
        nonce: snapshot.nonce,
      },
      update: {
        status: snapshot.status,
        currentMultiplier: snapshot.currentMultiplier.toScaledInteger(),
        startedAt: snapshot.startedAt,
        crashedAt: snapshot.crashedAt,
        completedAt: snapshot.completedAt,
        updatedAt: snapshot.updatedAt,
      },
    });

    for (const bet of snapshot.bets) {
      const existingBet = await this.prisma.bet.findUnique({
        where: {
          id: bet.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      const betData = {
        roundId: snapshot.id,
        playerId: bet.playerId,
        amountCents: bet.amount.toCents(),
        status: bet.status,
        autoCashoutMultiplier: bet.autoCashoutMultiplier?.toScaledInteger(),
        cashoutMultiplier: bet.cashoutMultiplier?.toScaledInteger(),
        payoutCents: bet.payoutCents,
        rejectionReason: bet.rejectionReason,
        updatedAt: bet.updatedAt,
      };

      if (!existingBet) {
        await this.prisma.bet.create({
          data: {
            id: bet.id,
            ...betData,
            createdAt: bet.createdAt,
          },
        });

        continue;
      }

      await this.prisma.bet.updateMany({
        where: {
          id: bet.id,
          updatedAt: {
            lte: bet.updatedAt,
          },
        },
        data: betData,
      });
    }
  }
}
