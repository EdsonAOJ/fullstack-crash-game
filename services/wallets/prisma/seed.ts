import { PrismaClient, WalletTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const PLAYER_ID = "player";
const INITIAL_BALANCE_CENTS = 100000n;
const SEED_EVENT_ID = "seed:player:initial-balance";

async function main(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const existingSeedTransaction =
      await transaction.walletTransaction.findUnique({
        where: {
          eventId: SEED_EVENT_ID,
        },
      });

    if (existingSeedTransaction) {
      console.log("Wallet seed already applied. Skipping.");
      return;
    }

    const wallet = await transaction.wallet.upsert({
      where: {
        playerId: PLAYER_ID,
      },
      create: {
        playerId: PLAYER_ID,
        balanceCents: INITIAL_BALANCE_CENTS,
      },
      update: {
        balanceCents: {
          increment: INITIAL_BALANCE_CENTS,
        },
      },
    });

    await transaction.walletTransaction.create({
      data: {
        walletId: wallet.id,
        eventId: SEED_EVENT_ID,
        type: WalletTransactionType.CREDIT,
        amountCents: INITIAL_BALANCE_CENTS,
        balanceBefore: wallet.balanceCents - INITIAL_BALANCE_CENTS,
        balanceAfter: wallet.balanceCents,
        referenceType: "SEED",
        referenceId: PLAYER_ID,
      },
    });

    console.log(
      `Seeded wallet for player "${PLAYER_ID}" with ${INITIAL_BALANCE_CENTS.toString()} cents.`,
    );
  });
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
