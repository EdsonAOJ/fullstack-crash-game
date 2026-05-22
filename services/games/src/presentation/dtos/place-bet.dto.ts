import { z } from "zod";

export const placeBetBodySchema = z.object({
  amountCents: z
    .string({
      required_error: "amountCents is required.",
      invalid_type_error: "amountCents must be a string.",
    })
    .trim()
    .regex(/^\d+$/, "amountCents must be a positive integer string.")
    .refine((value) => BigInt(value) > 0n, {
      message: "amountCents must be greater than zero.",
    }),
});

export type PlaceBetBodyDto = z.infer<typeof placeBetBodySchema>;
