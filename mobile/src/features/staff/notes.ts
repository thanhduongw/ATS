import { formatDate, formatTime } from "@/lib/format";
import { toFixedStage } from "@/lib/stages";
import { STRINGS } from "@/lib/strings";
import type {
  ApplicationResponse,
  InterviewResponse,
  OfferResponse,
} from "@/types/api";
import { needsMyEvaluation } from "./tasks";

const N = STRINGS.staff.candidates.note;
const DAY = 86_400_000;

const sameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** "PV hôm nay 16:00" / "PV 29/10 14:00". */
function interviewWhen(iso: string | undefined, now: number) {
  const t = new Date(iso ?? 0).getTime();
  return sameDay(t, now)
    ? N.todayAt(formatTime(iso))
    : `${formatDate(iso).slice(0, 5)} ${formatTime(iso)}`;
}

/**
 * Dòng việc cần làm dưới thẻ ứng viên (canvas UR02, UH02): "2/3 đánh giá · chờ quyết định",
 * "Chờ bạn đánh giá", "PV 29/10 14:00 · chờ phòng ban xác nhận", "Thư mời nháp chưa gửi"…
 */
export function candidateNote(
  app: ApplicationResponse,
  ctx: {
    interviews: InterviewResponse[];
    offers: OfferResponse[];
    me: number;
    now: number;
  },
): string | undefined {
  const stage = toFixedStage(app.currentStageType);
  const ivs = ctx.interviews
    .filter((iv) => iv.applicationId === app.id && iv.status !== "CANCELLED")
    .sort(
      (a, b) =>
        new Date(b.scheduledAt ?? 0).getTime() -
        new Date(a.scheduledAt ?? 0).getTime(),
    );
  const latest = ivs[0];

  if (stage === "OFFER") {
    const offer = ctx.offers.find(
      (o) => o.applicationId === app.id && o.status !== "REJECTED",
    );
    if (offer?.status === "DRAFT") return N.draftOffer;
    if (offer?.status === "APPROVED") return N.sentOffer;
  }
  if (stage === "INTERVIEW") {
    if (!latest) {
      const days = Math.floor(
        (ctx.now - new Date(app.appliedAt ?? ctx.now).getTime()) / DAY,
      );
      return N.notScheduled(days);
    }
    if (needsMyEvaluation(latest, ctx.me, ctx.now)) return N.waitYou;
    const people = latest.interviewers ?? [];
    const done = people.filter((p) => p.evaluationSubmitted).length;
    if (done > 0) return N.decide(done, people.length);
    const when = interviewWhen(latest.scheduledAt, ctx.now);
    if (latest.status === "SCHEDULED") return N.waitConfirm(when);
    if (new Date(latest.scheduledAt ?? 0).getTime() > ctx.now)
      return N.interviewAt(when);
  }
  if (stage === "APPLIED") {
    return N.appliedDaysAgo(
      Math.floor(
        (ctx.now - new Date(app.appliedAt ?? ctx.now).getTime()) / DAY,
      ),
    );
  }
  return undefined;
}
