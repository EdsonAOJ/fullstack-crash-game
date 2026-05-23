import { PrismaClient, WalletTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_BALANCE_CENTS = 100000n; // R$ 1.000,00

const DEMO_PLAYERS = [
  {
    playerId: "player",
    eventId: "seed:player:initial-balance",
  },
  {
    playerId: "player2",
    eventId: "seed:player2:initial-balance",
  },
  {
    playerId: "player3",
    eventId: "seed:player3:initial-balance",
  },
];

async function seedPlayerWallet(params: {
  playerId: string;
  eventId: string;
}): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const existingSeedTransaction =
      await transaction.walletTransaction.findUnique({
        where: {
          eventId: params.eventId,
        },
      });

    if (existingSeedTransaction) {
      console.log(
        `Wallet seed already applied for player "${params.playerId}". Skipping.`,
      );
      return;
    }

    const existingWallet = await transaction.wallet.findUnique({
      where: {
        playerId: params.playerId,
      },
    });

    const balanceBefore = existingWallet?.balanceCents ?? 0n;
    const balanceAfter = balanceBefore + INITIAL_BALANCE_CENTS;

    const wallet = await transaction.wallet.upsert({
      where: {
        playerId: params.playerId,
      },
      create: {
        playerId: params.playerId,
        balanceCents: balanceAfter,
      },
      update: {
        balanceCents: balanceAfter,
      },
    });

    await transaction.walletTransaction.create({
      data: {
        walletId: wallet.id,
        eventId: params.eventId,
        type: WalletTransactionType.CREDIT,
        amountCents: INITIAL_BALANCE_CENTS,
        balanceBefore,
        balanceAfter,
        referenceType: "SEED",
        referenceId: params.playerId,
      },
    });

    console.log(
      `Seeded wallet for player "${params.playerId}" with ${INITIAL_BALANCE_CENTS.toString()} cents.`,
    );
  });
}

async function main(): Promise<void> {
  for (const player of DEMO_PLAYERS) {
    await seedPlayerWallet(player);
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed wallet database.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
