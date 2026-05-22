import { createHash, createHmac } from "node:crypto";
import { PrismaClient, RoundStatus } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_CURRENT_MULTIPLIER = 100;
const PUBLIC_SEED = "crash-game";
const HOUSE_EDGE_PERCENT = 1;

const SEEDED_ROUND_ID = "00000000-0000-4000-8000-000000000001";
const SEEDED_SERVER_SEED = "seeded-server-seed-for-e2e";
const SEEDED_NONCE = 1;

function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

function calculateCrashPointMultiplier(input: {
  serverSeed: string;
  publicSeed: string;
  nonce: number;
}): number {
  const hmac = createHmac("sha256", input.serverSeed)
    .update(`${input.publicSeed}:${input.nonce}`)
    .digest("hex");

  const first52Bits = Number.parseInt(hmac.slice(0, 13), 16);
  const max52Bits = 2 ** 52;
  const randomRatio = first52Bits / max52Bits;

  const rawMultiplier =
    ((100 - HOUSE_EDGE_PERCENT) / 100) * (1 / (1 - randomRatio));

  const cappedMultiplier = Math.min(Math.max(rawMultiplier, 1), 100);

  return Math.floor(Number(cappedMultiplier.toFixed(2)) * 100);
}

async function main(): Promise<void> {
  const existingCurrentRound = await prisma.round.findFirst({
    where: {
      status: {
        in: [RoundStatus.WAITING_FOR_BETS, RoundStatus.RUNNING],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existingCurrentRound) {
    console.log(
      `Game seed already has a current round: ${existingCurrentRound.id}. Skipping.`,
    );
    return;
  }

  const existingSeededRound = await prisma.round.findUnique({
    where: {
      id: SEEDED_ROUND_ID,
    },
  });

  if (existingSeededRound) {
    console.log(
      `Seeded game round already exists: ${SEEDED_ROUND_ID}. Skipping.`,
    );
    return;
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() + 10_000);

  const serverSeed = SEEDED_SERVER_SEED;
  const serverSeedHash = hashServerSeed(serverSeed);
  const publicSeed = PUBLIC_SEED;
  const nonce = SEEDED_NONCE;

  const crashPointMultiplier = calculateCrashPointMultiplier({
    serverSeed,
    publicSeed,
    nonce,
  });

  const round = await prisma.round.create({
    data: {
      id: SEEDED_ROUND_ID,
      status: RoundStatus.WAITING_FOR_BETS,
      crashPointMultiplier,
      currentMultiplier: INITIAL_CURRENT_MULTIPLIER,
      serverSeed,
      serverSeedHash,
      publicSeed,
      nonce,
      startsAt,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(
    `Seeded deterministic game round: ${round.id} with crash multiplier ${crashPointMultiplier}.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed game database.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
