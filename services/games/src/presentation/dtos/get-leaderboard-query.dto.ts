import { z } from "zod";

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type GetLeaderboardQueryDto = z.infer<typeof getLeaderboardQuerySchema>;
