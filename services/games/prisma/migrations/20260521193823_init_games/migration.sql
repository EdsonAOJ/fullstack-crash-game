-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('WAITING_FOR_BETS', 'RUNNING', 'CRASHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING_DEBIT', 'ACCEPTED', 'REJECTED', 'CASHED_OUT_PENDING_CREDIT', 'CASHED_OUT', 'LOST');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL,
    "crashPointMultiplier" INTEGER NOT NULL,
    "currentMultiplier" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "crashedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL,
    "cashoutMultiplier" INTEGER,
    "payoutCents" BIGINT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rounds_status_idx" ON "rounds"("status");

-- CreateIndex
CREATE INDEX "rounds_createdAt_idx" ON "rounds"("createdAt");

-- CreateIndex
CREATE INDEX "bets_roundId_idx" ON "bets"("roundId");

-- CreateIndex
CREATE INDEX "bets_playerId_idx" ON "bets"("playerId");

-- CreateIndex
CREATE INDEX "bets_status_idx" ON "bets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bets_roundId_playerId_key" ON "bets"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
