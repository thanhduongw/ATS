import type { Href } from "expo-router";
import type { IconName } from "@/components/ui/icon";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { toFixedStage } from "@/lib/stages";
import { STRINGS } from "@/lib/strings";
import type { StatusTone } from "@/theme";
import type {
  ApplicationResponse,
  InterviewResponse,
  OfferResponse,
  RequisitionResponse,
  Role,
} from "@/types/api";

const T = STRINGS.staff.task;
const DAY = 86_400_000;

/** Khu route của người đang đăng nhập: cùng một màn nằm ở cả `app/hr` và `app/hm`. */
export type StaffArea = "hr" | "hm";
export const areaOf = (role?: Role | string): StaffArea =>
  role === "HIRING_MANAGER" ? "hm" : "hr";

export type StaffTask = {
  key: string;
  icon: IconName;
  tone: StatusTone;
  title: string;
  sub: string;
  action: string;
  href: Href;
  /** "Của tôi" (HR): việc do mình phụ trách. Đại diện phòng ban chỉ có việc của mình. */
  mine: boolean;
};

export type StaffData = {
  applications: ApplicationResponse[];
  interviews: InterviewResponse[];
  offers: OfferResponse[];
  requisitions: RequisitionResponse[];
};

const ACTIVE = new Set([
  "SCHEDULED",
  "HM_RESCHEDULE_PROPOSED",
  "HM_CONFIRMED",
  "CANDIDATE_CONFIRMED",
  "EVALUATION_PENDING",
]);
export const when = (iso?: string) =>
  `${formatDate(iso).slice(0, 5)} ${formatTime(iso)}`;

/** Buổi đã diễn ra, tôi phỏng vấn và chưa nộp đánh giá. */
export const needsMyEvaluation = (
  iv: InterviewResponse,
  me: number,
  now: number,
) =>
  iv.status !== "CANCELLED" &&
  iv.status !== "NO_SHOW" &&
  new Date(iv.scheduledAt ?? 0).getTime() < now &&
  (iv.interviewers ?? []).some(
    (p) => p.interviewerId === me && !p.evaluationSubmitted,
  );

/** UR01 — 7 loại việc của Chuyên viên tuyển dụng (cùng quy tắc với web `MyWorkPage.recruiterTasks`). */
export function recruiterTasks(
  d: StaffData,
  me: number,
  now: number,
): StaffTask[] {
  const tasks: StaffTask[] = [];
  const appById = new Map(d.applications.map((a) => [a.id, a]));
  const ivs = d.interviews.filter((iv) => iv.status !== "CANCELLED");

  ivs
    .filter((iv) => needsMyEvaluation(iv, me, now))
    .forEach((iv) => {
      const done = (iv.interviewers ?? [])
        .filter((p) => p.evaluationSubmitted)
        .map((p) => p.fullName ?? "");
      tasks.push({
        key: `eval-${iv.id}`,
        icon: "edit",
        tone: "warning",
        mine: true,
        title: T.evaluate(iv.candidateName ?? ""),
        sub: T.evaluateSub(when(iv.scheduledAt), done),
        action: T.action.write,
        href: {
          pathname: "/hr/evaluations/[id]",
          params: { id: String(iv.id) },
        },
      });
    });

  ivs
    .filter((iv) => (iv.interviewers ?? []).some((p) => p.evaluationSubmitted))
    .filter(
      (iv) =>
        toFixedStage(appById.get(iv.applicationId)?.currentStageType) ===
        "INTERVIEW",
    )
    .forEach((iv) => {
      const people = iv.interviewers ?? [];
      tasks.push({
        key: `decide-${iv.id}`,
        icon: "checkSquare",
        tone: "success",
        mine: appById.get(iv.applicationId)?.assignedRecruiterId === me,
        title: T.decide(iv.candidateName ?? ""),
        sub: T.decideSub(
          people.filter((p) => p.evaluationSubmitted).length,
          people.length,
          "",
        ),
        action: T.action.view,
        href: {
          pathname: "/hr/applications/[id]",
          params: { id: String(iv.applicationId) },
        },
      });
    });

  ivs
    .filter((iv) => iv.status === "HM_RESCHEDULE_PROPOSED")
    .forEach((iv) => {
      const who =
        (iv.interviewers ?? []).find((p) => p.interviewerId === iv.proposedBy)
          ?.fullName ?? "";
      tasks.push({
        key: `resched-${iv.id}`,
        icon: "clock",
        tone: "interview",
        mine: appById.get(iv.applicationId)?.assignedRecruiterId === me,
        title: T.reschedule(iv.candidateName ?? ""),
        sub: T.rescheduleSub(
          who,
          when(iv.scheduledAt),
          iv.proposedScheduledAt ? formatTime(iv.proposedScheduledAt) : "",
        ),
        action: T.action.view,
        href: {
          pathname: "/hr/interviews/[id]",
          params: { id: String(iv.id) },
        },
      });
    });

  const fresh = d.applications.filter(
    (a) => toFixedStage(a.currentStageType) === "APPLIED",
  );
  for (const [list, mine] of [
    [fresh, false],
    [fresh.filter((a) => a.assignedRecruiterId === me), true],
  ] as const) {
    if (!list.length) continue;
    const old = list.filter(
      (a) => now - new Date(a.appliedAt ?? now).getTime() >= 2 * DAY,
    ).length;
    tasks.push({
      key: `screen-${mine}`,
      icon: "document",
      tone: "brand",
      mine,
      title: T.screen(list.length),
      sub: T.screenSub(old),
      action: T.action.view,
      href: { pathname: "/hr/applications", params: { stage: "APPLIED" } },
    });
  }

  d.offers
    .filter((o) => o.status === "DRAFT")
    .forEach((o) =>
      tasks.push({
        key: `offer-${o.id}`,
        icon: "send",
        tone: "brand",
        mine: o.requesterId === me,
        title: T.offer(o.candidateName ?? ""),
        sub: T.offerSub(o.salaryOffered ? formatMoney(o.salaryOffered) : ""),
        action: T.action.view,
        href: { pathname: "/hr/offers", params: { id: String(o.id) } },
      }),
    );

  const pending = d.requisitions.filter((r) => r.status === "PENDING_APPROVAL");
  if (pending.length) {
    const titles = pending
      .map((r) => r.title)
      .filter(Boolean)
      .slice(0, 2);
    tasks.push({
      key: "approve-req",
      icon: "clipboardCheck",
      tone: "brand",
      mine: true,
      title: T.approveReqs(pending.length),
      sub: titles.join(" · "),
      action: T.action.view,
      href: "/hr/requisitions",
    });
  }
  return tasks;
}

/** UH01 — việc của Đại diện phòng ban (cùng quy tắc với web `MyWorkPage.managerTasks`). */
export function managerTasks(
  d: StaffData,
  me: number,
  now: number,
): StaffTask[] {
  const tasks: StaffTask[] = [];
  d.interviews
    .filter((iv) => needsMyEvaluation(iv, me, now))
    .forEach((iv) => {
      const people = iv.interviewers ?? [];
      tasks.push({
        key: `eval-${iv.id}`,
        icon: "edit",
        tone: "warning",
        mine: true,
        title: T.evaluate(iv.candidateName ?? ""),
        sub: T.evaluateSubHm(
          when(iv.scheduledAt),
          people.filter((p) => p.evaluationSubmitted).length,
          people.length,
        ),
        action: T.action.write,
        href: {
          pathname: "/hm/evaluations/[id]",
          params: { id: String(iv.id) },
        },
      });
    });
  d.interviews
    .filter(
      (iv) =>
        iv.status === "SCHEDULED" &&
        !iv.hmConfirmed &&
        (iv.interviewers ?? []).some((p) => p.interviewerId === me),
    )
    .forEach((iv) =>
      tasks.push({
        key: `confirm-${iv.id}`,
        icon: "calendar",
        tone: "interview",
        mine: true,
        title: T.confirm(iv.candidateName ?? ""),
        sub: when(iv.scheduledAt),
        action: T.action.confirm,
        href: {
          pathname: "/hm/interviews/[id]",
          params: { id: String(iv.id) },
        },
      }),
    );
  d.requisitions
    .filter((r) => r.requesterId === me && r.status === "CHANGES_REQUESTED")
    .forEach((r) =>
      tasks.push({
        key: `fix-${r.id}`,
        icon: "edit",
        tone: "interview",
        mine: true,
        title: T.fixReq(r.title ?? ""),
        sub: T.fixReqSub(r.hrNote ?? ""),
        action: T.action.open,
        href: {
          pathname: "/hm/requisitions/[id]",
          params: { id: String(r.id) },
        },
      }),
    );
  d.requisitions
    .filter((r) => r.requesterId === me && r.status === "DRAFT")
    .forEach((r) =>
      tasks.push({
        key: `draft-${r.id}`,
        icon: "document",
        tone: "neutral",
        mine: true,
        title: T.draftReq(r.title ?? ""),
        sub: T.draftReqSub,
        action: T.action.open,
        href: {
          pathname: "/hm/requisitions/[id]",
          params: { id: String(r.id) },
        },
      }),
    );
  return tasks;
}

/** Hồ sơ đang ở Phỏng vấn mà chưa có buổi nào còn hiệu lực. */
export const unscheduled = (
  d: Pick<StaffData, "applications" | "interviews">,
) => {
  const has = new Set(
    d.interviews
      .filter((iv) => ACTIVE.has(iv.status ?? ""))
      .map((iv) => iv.applicationId),
  );
  return d.applications.filter(
    (a) => toFixedStage(a.currentStageType) === "INTERVIEW" && !has.has(a.id),
  );
};
