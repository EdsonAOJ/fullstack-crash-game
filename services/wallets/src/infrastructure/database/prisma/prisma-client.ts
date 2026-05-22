import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaClientLike = PrismaClient | Prisma.TransactionClient;
