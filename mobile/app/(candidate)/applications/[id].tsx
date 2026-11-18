import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyApplication, useWithdrawApplication } from "@/features/applications/hooks";
import { useMyInterviews } from "@/features/interviews/hooks";
import { awaitsReply } from "@/features/interviews/rules";
import { useMyOffers } from "@/features/offers/hooks";
import { apiErrorMessage } from "@/api/client";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useSnackbar } from "@/components/ui/snackbar";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, Divider, Eyebrow } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { applicationPhase, interviewStatus, offerStatus, stageStatus } from "@/lib/status";
import { cvFileName, formatDate, formatTime } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LETTER_SPACING, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateApplication, CandidateInterview, CandidateOffer } from "@/types/api";

const S = STRINGS.applicationDetail;
const P = STRINGS.applications.timeline;
const I = STRINGS.interviewDetail;
/** Buổi không còn diễn ra — không dùng làm "buổi sắp tới". */
const INACTIVE = new Set(["CANCELLED", "EXPIRED", "NO_SHOW", "CANDIDATE_DECLINED"]);

/**
 * Chi tiết đơn ứng tuyển — Redesign-Final `views.applicationDetail`: thẻ đơn (mã, trạng thái, vòng hiện tại, chuyên viên
 * phụ trách, tiến trình 4 bước, CV đã nộp) · mục "Phỏng vấn" (mọi buổi của đơn, bấm mở chi tiết buổi) · mục
 * "Thư mời nhận việc" (thư mời của đơn) · nút rút đơn.
 */
export default function ApplicationDetailScreen() {
  const now = useNow();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const app = useMyApplication(id);
  const interviews = useMyInterviews();
  const offers = useMyOffers();
  const insets = useSafeAreaInsets();
  const withdraw = useWithdrawApplication(id);
  const notify = useSnackbar();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const canWithdraw = !!app.data && !applicationPhase(app.data.currentStageType).ended;

  const refetchAll = () => {
    void app.refetch();
    void interviews.refetch();
    void offers.refetch();
  };

  const mine = (interviews.data ?? [])
    .filter((iv) => iv.applicationId === id)
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime());
  const myOffers = (offers.data ?? [])
    .filter((o) => o.applicationId === id)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  // Buổi sắp tới gần nhất còn hiệu lực — dùng cho dòng "Phỏng vấn" trong tiến trình (bỏ buổi đã huỷ/hết hạn/bị từ chối).
  const next = mine.find(
    (iv) => new Date(iv.scheduledAt ?? 0).getTime() >= now && !INACTIVE.has(iv.status ?? "")
  );

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.title} />
      {app.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : app.isError ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(app.error, "")} onRetry={() => void app.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
          refreshControl={
            <RefreshControl
              refreshing={app.isRefetching}
              onRefresh={refetchAll}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <SummaryCard app={app.data} interview={next} />

          <SectionHead kicker={S.interviewsKicker} title={S.interviewsTitle} note={mine.length ? S.interviewCount(mine.length) : undefined} />
          {mine.length ? (
            mine.map((iv) => <InterviewCard key={iv.id} interview={iv} now={now} />)
          ) : (
            <Card>
              <Text style={styles.sub}>{S.noInterview}</Text>
            </Card>
          )}

          <SectionHead kicker={S.offersKicker} title={S.offersTitle} />
          {myOffers.length ? (
            myOffers.map((o) => <OfferCard key={o.id} offer={o} fallbackTitle={app.data.jobTitle ?? ""} />)
          ) : (
            <Card>
              <Text style={styles.sub}>{S.noOffer}</Text>
            </Card>
          )}

          <View style={styles.actions}>
            {app.data.jobPostingId != null ? (
              <PillButton
                label={S.viewJob}
                variant="outline"
                fullWidth
                onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: String(app.data.jobPostingId) } })}
              />
            ) : null}
            {canWithdraw ? (
              <PillButton label={S.withdraw} variant="danger" fullWidth onPress={() => setConfirmWithdraw(true)} />
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* Hành động không hoàn tác được → xác nhận bằng nút đỏ trong bảng trượt (DS06). */}
      <BottomSheet
        visible={confirmWithdraw}
        onDismiss={() => setConfirmWithdraw(false)}
        title={S.withdrawTitle}
        subtitle={app.data?.jobTitle ?? undefined}
        footer={
          <PillButton
            label={S.withdrawConfirm}
            variant="danger"
            fullWidth
            loading={withdraw.isPending}
            onPress={() =>
              withdraw.mutate(undefined, {
                onSuccess: () => {
                  setConfirmWithdraw(false);
                  notify(S.withdrawDone);
                },
                onError: (e) => notify(apiErrorMessage(e, S.withdrawFailed)),
              })
            }
          />
        }
      >
        <Text style={styles.sub}>{S.withdrawBody}</Text>
      </BottomSheet>
    </View>
  );
}

function SectionHead({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.flex}>
        <Eyebrow>{kicker}</Eyebrow>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {note ? <Text style={styles.sub}>{note}</Text> : null}
    </View>
  );
}

function SummaryCard({ app, interview }: { app: CandidateApplication; interview?: CandidateInterview }) {
  return (
    <Card>
      <View style={styles.row}>
        {app.id != null ? <Eyebrow>{S.code(app.id)}</Eyebrow> : <View />}
        <StatusChip {...stageStatus(app.currentStageType, app.currentStageName)} />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.jobTitle} accessibilityRole="header">
          {app.jobTitle}
        </Text>
        <Text style={styles.sub}>
          {[app.departmentName, S.appliedOn(formatDate(app.appliedAt))].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Divider />
      <View style={styles.kv}>
        <Text style={styles.sub}>{S.currentStatus}</Text>
        <Text style={styles.kvValue}>{app.currentStageName || stageStatus(app.currentStageType).label}</Text>
      </View>
      {app.recruiterName ? (
        <View style={styles.kv}>
          <Text style={styles.sub}>{S.recruiter}</Text>
          <Text style={styles.kvValue}>{app.recruiterName}</Text>
        </View>
      ) : null}
      <Divider />
      <Eyebrow>{S.progressKicker}</Eyebrow>
      <Timeline app={app} interview={interview} />
      {app.resumeUrl ? (
        <>
          <Divider />
          <View style={styles.kv}>
            <Text style={styles.sub}>{S.cvSubmitted}</Text>
            <Text style={styles.kvValue} numberOfLines={1}>
              {cvFileName(app.resumeUrl)}
            </Text>
          </View>
        </>
      ) : null}
    </Card>
  );
}

/**
 * Dòng thời gian dọc 4 bước (`.timeline`). Backend chỉ trả vòng hiện tại, không có ngày của từng vòng → bước đã qua
 * ghi "Đã qua", bước đầu ghi ngày nộp, bước phỏng vấn ghi giờ buổi sắp tới nếu có.
 */
function Timeline({ app, interview }: { app: CandidateApplication; interview?: CandidateInterview }) {
  const phase = applicationPhase(app.currentStageType);
  type Item = { title: string; subtitle: string; state: "done" | "current" | "upcoming" | "stopped" };
  const items: Item[] = phase.rejected
    ? [
        { title: P[0]!, subtitle: formatDate(app.appliedAt), state: "done" },
        {
          title: phase.withdrawn ? S.withdrawnTitle : S.rejectedTitle,
          subtitle: phase.withdrawn ? S.withdrawnNote : (app.rejectionReasonName ?? app.currentStageName ?? ""),
          state: "stopped",
        },
      ]
    : P.map((title, i) => {
        const done = i < phase.step || phase.hired;
        const current = i === phase.step && !phase.hired;
        let subtitle: string = done ? S.stepDone : current ? S.stepCurrent : S.stepUpcoming;
        if (i === 0) subtitle = formatDate(app.appliedAt);
        else if (current && app.currentStageName) subtitle = app.currentStageName;
        if (current && i === 2 && interview?.scheduledAt)
          subtitle = `${formatDate(interview.scheduledAt)} · ${formatTime(interview.scheduledAt)}`;
        return {
          title: phase.hired && i === P.length - 1 ? S.hiredTitle : title,
          subtitle,
          state: done ? "done" : current ? "current" : "upcoming",
        } as Item;
      });

  return (
    <View>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <View key={i} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View
                style={[
                  styles.tlDot,
                  it.state === "done" && styles.tlDotDone,
                  it.state === "current" && styles.tlDotCurrent,
                  it.state === "stopped" && styles.tlDotStopped,
                ]}
              />
              {!last ? <View style={[styles.tlLine, it.state === "done" && styles.tlLineDone]} /> : null}
            </View>
            <View style={[styles.tlText, !last && styles.tlTextGap]}>
              <Text style={[styles.tlTitle, it.state === "upcoming" && styles.muted]}>{it.title}</Text>
              {it.subtitle ? <Text style={styles.small}>{it.subtitle}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InterviewCard({ interview, now }: { interview: CandidateInterview; now: number }) {
  const waiting = awaitsReply(interview, now);
  const hint = waiting
    ? S.ivNeedsReply
    : interview.status === "CANDIDATE_CONFIRMED"
      ? S.ivConfirmed
      : S.ivView;
  return (
    <Card
      onPress={() =>
        interview.id != null && router.push({ pathname: "/interviews/[id]", params: { id: String(interview.id) } })
      }
      accessibilityLabel={`${S.interviewsTitle} ${formatDate(interview.scheduledAt)}`}
      style={waiting && styles.cardHighlight}
    >
      <View style={styles.row}>
        <Text style={styles.ivWhen}>
          {formatDate(interview.scheduledAt)} · {formatTime(interview.scheduledAt)}
        </Text>
        <StatusChip {...interviewStatus(interview.status, "CANDIDATE")} />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.sub}>
          {I.timeAndLength(
            interview.format === "ONLINE" ? I.formatOnline : I.formatOffline,
            interview.durationMinutes ?? 60
          )}
        </Text>
        {interview.interviewerNames?.length ? (
          <Text style={styles.sub}>{S.interviewers(interview.interviewerNames.join(", "))}</Text>
        ) : null}
      </View>
      <View style={styles.row}>
        <Text style={[styles.sub, waiting && styles.hintStrong]}>{hint}</Text>
        <Link label={S.detailLink} />
      </View>
    </Card>
  );
}

function OfferCard({ offer, fallbackTitle }: { offer: CandidateOffer; fallbackTitle: string }) {
  const awaiting = offer.status === "APPROVED";
  const hint = awaiting ? S.offerAwaiting : offer.status === "ACCEPTED" ? S.offerAccepted : S.offerReview;
  const meta = [
    offer.startDate ? S.offerStart(formatDate(offer.startDate)) : S.offerStartTbd,
    offer.responseDeadline ? S.offerDeadline(formatDate(offer.responseDeadline)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card
      onPress={() => offer.id != null && router.push({ pathname: "/offers/[id]", params: { id: String(offer.id) } })}
      accessibilityLabel={S.offerCard(offer.jobTitle || fallbackTitle)}
      style={awaiting && styles.cardHighlight}
    >
      <View style={styles.row}>
        <Text style={[styles.ivWhen, styles.flex]} numberOfLines={2}>
          {S.offerCard(offer.jobTitle || fallbackTitle)}
        </Text>
        <StatusChip {...offerStatus(offer.status, "CANDIDATE")} />
      </View>
      <Text style={styles.sub}>{meta}</Text>
      <View style={styles.row}>
        <Text style={[styles.sub, awaiting && styles.hintStrong]}>{hint}</Text>
        <Link label={S.openOffer} />
      </View>
    </Card>
  );
}

function Link({ label }: { label: string }) {
  return (
    <View style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
      <Icon name="arrowRight" size={SIZES.iconXs} color={COLORS.primaryDark} strokeWidth={1.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  titleBlock: { gap: SPACING.xxs },
  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.section,
    lineHeight: FONT_SIZE.section * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  small: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  muted: { color: COLORS.textSecondary },
  kv: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm2 },
  kvValue: { flexShrink: 1, textAlign: "right", fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm, marginTop: SPACING.sm2 },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.section,
    letterSpacing: LETTER_SPACING.title,
    color: COLORS.textPrimary,
  },
  cardHighlight: { borderColor: COLORS.primary },
  ivWhen: { fontFamily: FONT.bold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  hintStrong: { fontFamily: FONT.semibold, color: COLORS.primaryDark },
  link: { flexDirection: "row", alignItems: "center", gap: SPACING.xxs },
  linkText: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
  actions: { gap: SPACING.sm2, marginTop: SPACING.sm2 },

  tlRow: { flexDirection: "row", gap: SPACING.sm2 },
  // Chấm tròn nhỏ + đường dọc mảnh (`.step:before`, `.timeline:before`).
  tlRail: { alignItems: "center", width: SIZES.stepDot + SPACING.xs, paddingTop: SPACING.xs },
  tlDot: {
    width: SIZES.stepDot,
    height: SIZES.stepDot,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fillStrong,
  },
  tlDotDone: { backgroundColor: COLORS.primary },
  tlDotCurrent: { backgroundColor: COLORS.cardBg, borderWidth: SIZES.track, borderColor: COLORS.primary },
  tlDotStopped: { backgroundColor: COLORS.errorText },
  tlLine: { width: SIZES.border, flexGrow: 1, minHeight: SPACING.md2, marginTop: SPACING.xs, backgroundColor: COLORS.border },
  tlLineDone: { backgroundColor: COLORS.primary },
  tlText: { flex: 1, gap: SPACING.xxs },
  tlTextGap: { paddingBottom: SPACING.sm2 },
  tlTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
});
