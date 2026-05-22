/*
  Warnings:

  - A unique constraint covering the columns `[type,referenceType,referenceId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_type_referenceType_referenceId_key" ON "wallet_transactions"("type", "referenceType", "referenceId");
