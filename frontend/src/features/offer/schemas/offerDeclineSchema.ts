import { z } from "zod";

export const offerDeclineSchema = z.object({
  declineReasonId: z.number(),
  note: z.string().optional().nullable(),
});

export type OfferDeclineFormValues = z.infer<typeof offerDeclineSchema>;
