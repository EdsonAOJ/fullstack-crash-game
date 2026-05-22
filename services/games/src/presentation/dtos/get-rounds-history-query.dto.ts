import { z } from "zod";

export const getRoundsHistoryQuerySchema = z.object({
  limit: z
    .string()
    .trim()
    .regex(/^\d+$/, "limit must be a positive integer.")
    .refine((value) => {
      const parsed = Number(value);

      return Number.isSafeInteger(parsed) && parsed > 0;
    }, "limit must be a positive integer.")
    .transform((value) => Number(value))
    .optional(),
});

export type GetRoundsHistoryQueryDto = z.infer<
  typeof getRoundsHistoryQuerySchema
>;
