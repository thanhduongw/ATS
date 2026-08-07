import { z } from "zod";

export const interviewCreateSchema = z
  .object({
    scheduledAt: z.string().min(1, "Vui lòng chọn thời gian phỏng vấn"),
    durationMinutes: z.number().positive("Thời lượng phải lớn hơn 0"),
    format: z.enum(["ONLINE", "OFFLINE"]),
    location: z.string().optional().nullable(),
    meetingLink: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    interviewerIds: z.array(z.number()).min(1, "Phải chọn ít nhất 1 người phỏng vấn"),
  })
  .superRefine((data, ctx) => {
    if (data.format === "ONLINE" && (!data.meetingLink || data.meetingLink.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingLink"],
        message: "Phỏng vấn Online cần nhập link họp",
      });
    }
    if (data.format === "OFFLINE" && (!data.location || data.location.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Phỏng vấn Offline cần nhập địa điểm",
      });
    }
  });

export type InterviewCreateFormValues = z.infer<typeof interviewCreateSchema>;
