import { z } from "zod";

export const getMyBetsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type GetMyBetsQueryDto = z.infer<typeof getMyBetsQuerySchema>;
