import { z } from "zod";

export const candidateSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  currentPosition: z.string().optional().nullable(),
  educationLevelId: z.number().optional().nullable(),
  skillIds: z.array(z.number()).optional().nullable(),
  internalNote: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;
