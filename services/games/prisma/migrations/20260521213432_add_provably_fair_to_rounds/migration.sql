/*
  Warnings:

  - Added the required column `nonce` to the `rounds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicSeed` to the `rounds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverSeed` to the `rounds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverSeedHash` to the `rounds` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "nonce" INTEGER NOT NULL,
ADD COLUMN     "publicSeed" TEXT NOT NULL,
ADD COLUMN     "serverSeed" TEXT NOT NULL,
ADD COLUMN     "serverSeedHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "rounds_nonce_idx" ON "rounds"("nonce");
