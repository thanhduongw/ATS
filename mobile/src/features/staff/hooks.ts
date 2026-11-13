import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { masterdataApi } from "@/features/masterdata/api";
import { planNextFixedStage } from "@/lib/stages";
import { useAuthStore } from "@/store/authStore";
import type {
  ApplicationRejectRequest,
  RequisitionUpdateRequest,
  EvaluationDraftRequest,
  EvaluationSubmitRequest,
  InterviewHmRejectRequest,
} from "@/types/api";
import { staffApi } from "./api";

/**
 * Hook dữ liệu cho khu nhân viên (UR, UH). Danh sách lấy một lần rồi lọc ở client — giống web
 * (`MyWorkPage`, quyết định B7: frontend ghép nhiều API).
 */
export const staffKeys = {
  all: ["staff"] as const,
  me: () => [...staffKeys.all, "me"] as const,
  applications: () => [...staffKeys.all, "applications"] as const,
  application: (id: number) => [...staffKeys.all, "application", id] as const,
  history: (id: number) => [...staffKeys.all, "history", id] as const,
  interviews: () => [...staffKeys.all, "interviews"] as const,
  interview: (id: number) => [...staffKeys.all, "interview", id] as const,
  evaluations: (applicationId: number) =>
    [...staffKeys.all, "evaluations", applicationId] as const,
  interviewEvaluations: (interviewId: number) =>
    [...staffKeys.all, "interview-evaluations", interviewId] as const,
  offers: () => [...staffKeys.all, "offers"] as const,
  requisitions: () => [...staffKeys.all, "requisitions"] as const,
  postings: () => [...staffKeys.all, "postings"] as const,
  posting: (id: number) => [...staffKeys.all, "posting", id] as const,
  ai: (applicationId: number) =>
    [...staffKeys.all, "ai", applicationId] as const,
};

const valid = (id: number) => Number.isFinite(id) && id > 0;

/** userId của người đang đăng nhập (claim `sub`). */
export function useMyId(): number {
  return Number(useAuthStore((s) => s.user?.sub) ?? 0);
}

export const useMe = () =>
  useQuery({
    queryKey: staffKeys.me(),
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
  });

/** M10: lưu họ tên / số điện thoại; làm mới hồ sơ ở mọi màn. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (p) => qc.setQueryData(staffKeys.me(), p),
  });
}

export const useChangePassword = () => useMutation({ mutationFn: authApi.changePassword });

/** Tên công ty (UR10/UH09). */
export const useCompanyName = () =>
  useQuery({
    queryKey: [...staffKeys.all, "company"],
    queryFn: authApi.publicCompany,
    staleTime: 30 * 60_000,
    select: (c) => c.name ?? "",
  });

export const useStaffApplications = () =>
  useQuery({
    queryKey: staffKeys.applications(),
    queryFn: staffApi.applications,
  });
export const useStaffApplication = (id: number) =>
  useQuery({
    queryKey: staffKeys.application(id),
    queryFn: () => staffApi.application(id),
    enabled: valid(id),
  });
export const useApplicationHistory = (id: number) =>
  useQuery({
    queryKey: staffKeys.history(id),
    queryFn: () => staffApi.history(id),
    enabled: valid(id),
  });

/**
 * Buổi phỏng vấn. Chuyên viên tuyển dụng thấy mọi buổi; Đại diện phòng ban dùng
 * `?interviewerId={me}` (CLAUDE.md — "Sự thật về backend").
 */
export function useStaffInterviews() {
  const role = useAuthStore((s) => s.user?.role);
  const me = useMyId();
  const params = role === "HIRING_MANAGER" ? { interviewerId: me } : undefined;
  return useQuery({
    queryKey: staffKeys.interviews(),
    queryFn: () => staffApi.interviews(params),
  });
}
export const useStaffInterview = (id: number) =>
  useQuery({
    queryKey: staffKeys.interview(id),
    queryFn: () => staffApi.interview(id),
    enabled: valid(id),
  });
export const useApplicationEvaluations = (applicationId: number) =>
  useQuery({
    queryKey: staffKeys.evaluations(applicationId),
    queryFn: () => staffApi.applicationEvaluations(applicationId),
    enabled: valid(applicationId),
  });
export const useInterviewEvaluations = (interviewId: number) =>
  useQuery({
    queryKey: staffKeys.interviewEvaluations(interviewId),
    queryFn: () => staffApi.interviewEvaluations(interviewId),
    enabled: valid(interviewId),
  });

/** Thư mời — chỉ Chuyên viên tuyển dụng (Đại diện phòng ban không xem lương, quyết định C7). */
export const useStaffOffers = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: staffKeys.offers(),
    queryFn: () => staffApi.offers(),
    enabled: options?.enabled,
  });
export const useStaffRequisitions = () =>
  useQuery({
    queryKey: staffKeys.requisitions(),
    queryFn: staffApi.requisitions,
  });
export const useStaffRequisition = (id: number) =>
  useQuery({
    queryKey: [...staffKeys.requisitions(), id],
    queryFn: () => staffApi.requisition(id),
    enabled: valid(id),
  });

/** UH13: lưu nháp hoặc gửi lại để duyệt sau khi sửa theo góp ý. */
export function useSaveRequisition(id: number) {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ body, submit }: { body: RequisitionUpdateRequest; submit: boolean }) => {
      const saved = await staffApi.updateRequisition(id, body);
      return submit ? staffApi.submitRequisition(id) : saved;
    },
    onSuccess: invalidate,
  });
}

export const useStaffPostings = () =>
  useQuery({ queryKey: staffKeys.postings(), queryFn: staffApi.postings });
export const useStaffPosting = (id: number) =>
  useQuery({
    queryKey: staffKeys.posting(id),
    queryFn: () => staffApi.posting(id),
    enabled: valid(id),
  });
export const useAiScore = (applicationId: number) =>
  useQuery({
    queryKey: staffKeys.ai(applicationId),
    queryFn: () => staffApi.aiScore(applicationId),
    enabled: valid(applicationId),
  });

export const useCriteria = () =>
  useQuery({
    queryKey: ["masterdata", "interview-criteria"],
    queryFn: masterdataApi.interviewCriteria,
    staleTime: 10 * 60_000,
  });

/** Làm mới mọi thứ của khu nhân viên sau một thao tác (hồ sơ, lịch, việc cần làm đều đổi theo). */
function useInvalidateStaff() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: staffKeys.all });
}

/**
 * UR05: chuyển sang giai đoạn cố định kế tiếp. Lấy pipeline của việc làm, tính số bước tới bước
 * ĐẦU của giai đoạn kế rồi gọi "chuyển tiếp" từng bước (backend chỉ cho đi một bước mỗi lần).
 */
export function useAdvanceToNextStage() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({
      applicationId,
      note,
    }: {
      applicationId: number;
      note?: string;
    }) => {
      const app = await staffApi.application(applicationId);
      const posting = await staffApi.posting(app.jobPostingId ?? 0);
      const pipeline = await masterdataApi.pipeline(posting.pipelineId ?? 0);
      const plan = planNextFixedStage(
        pipeline.stages ?? [],
        app.currentStageId,
      );
      if (!plan) throw new Error("NO_NEXT_STAGE");
      for (let i = 0; i < plan.steps; i += 1)
        await staffApi.advance(applicationId, note);
      return plan.target;
    },
    onSuccess: invalidate,
  });
}

export function useRejectApplication() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({
      applicationId,
      body,
    }: {
      applicationId: number;
      body: ApplicationRejectRequest;
    }) => staffApi.reject(applicationId, body),
    onSuccess: invalidate,
  });
}

/** Thao tác trên một buổi phỏng vấn (UR08, UH05, UH06). */
export function useInterviewAction() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (
      a:
        | {
            kind: "approveProposal" | "rejectProposal" | "cancel" | "hmConfirm";
            id: number;
          }
        | { kind: "hmReject"; id: number; body: InterviewHmRejectRequest },
    ) => {
      switch (a.kind) {
        case "approveProposal":
          return staffApi.approveProposal(a.id);
        case "rejectProposal":
          return staffApi.rejectProposal(a.id);
        case "cancel":
          return staffApi.cancelInterview(a.id);
        case "hmConfirm":
          return staffApi.hmConfirm(a.id);
        case "hmReject":
          return staffApi.hmReject(a.id, a.body);
      }
    },
    onSuccess: invalidate,
  });
}

export function useSaveEvaluationDraft(interviewId: number) {
  return useMutation({
    mutationFn: (body: EvaluationDraftRequest) =>
      staffApi.saveEvaluationDraft(interviewId, body),
  });
}

export function useSubmitEvaluation(interviewId: number) {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (body: EvaluationSubmitRequest) =>
      staffApi.submitEvaluation(interviewId, body),
    onSuccess: invalidate,
  });
}
