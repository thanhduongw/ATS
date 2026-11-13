import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { StatusChip } from "@/components/ui/status-chip";
import { Card } from "@/components/ui/surfaces";
import { WEB_URL } from "@/config";
import { formatDate } from "@/lib/format";
import { MAIN_STAGES, toFixedStage, type FixedStage } from "@/lib/stages";
import { postingStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import { CandidateCard } from "../candidate-card";
import { useMyId, useStaffApplications, useStaffInterviews, useStaffOffers, useStaffPosting, useStaffRequisitions } from "../hooks";
import { candidateNote } from "../notes";

const L = STRINGS.staff.job;
const STAGE = STRINGS.staff.stage;
const DAY = 86_400_000;
const ddmm = (iso?: string) => (iso ? formatDate(iso).slice(0, 5) : "");

/**
 * UR15 · Chi tiết việc làm (Chuyên viên tuyển dụng): trạng thái + hạn nộp, người yêu cầu · số cần · đã tuyển,
 * 5 ô giai đoạn (số ứng viên ĐANG ở giai đoạn đó, bấm để lọc), danh sách ứng viên của ô đang chọn.
 * "So sánh trên máy tính" mở trang so sánh ứng viên của web (DS06 — mobile không so sánh).
 * Nút liên kết: chia sẻ trang tuyển dụng công khai, chỉ khi tin đang tuyển.
 */
export function StaffJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postingId = Number(id);
  const me = useMyId();
  const now = useNow();
  const posting = useStaffPosting(postingId);
  const apps = useStaffApplications();
  const ivs = useStaffInterviews();
  const offers = useStaffOffers();
  const reqs = useStaffRequisitions();
  const [picked, setPicked] = useState<FixedStage | null>(null);

  const queries = [posting, apps, ivs, offers];
  const refetch = () => void Promise.all([...queries, reqs].map((q) => q.refetch()));
  const p = posting.data;
  const shareUrl = p?.status === "OPEN" && WEB_URL ? `${WEB_URL}/careers/jobs/${p.id}` : "";

  const header = (
    <ScreenHeader
      variant="compact"
      back
      title={L.title}
      actions={shareUrl ? (
        <IconButton icon="link" label={L.share} onPress={() => void Share.share({ message: `${p?.title ?? ""}\n${shareUrl}`, url: shareUrl })} />
      ) : undefined}
    />
  );
  if (posting.isPending || apps.isPending) return (<>{header}<SkeletonList /></>);
  if (posting.isError || !p) return (<>{header}<ErrorState message={apiErrorMessage(posting.error)} onRetry={refetch} /></>);

  const list = (apps.data ?? []).filter((a) => a.jobPostingId === p.id);
  const count = (s: FixedStage) => list.filter((a) => toFixedStage(a.currentStageType) === s).length;
  const hired = count("HIRED");
  // Mặc định ô Phỏng vấn (như HTML); trống thì ô đầu tiên có ứng viên để màn không trắng.
  const stage = picked ?? (count("INTERVIEW") > 0 ? "INTERVIEW" : (MAIN_STAGES.find((s) => count(s) > 0) ?? "INTERVIEW"));
  const owner = (reqs.data ?? []).find((r) => r.id === p.requisitionId)?.requesterName ?? "";
  const deadline = p.applicationDeadline;
  const when = p.status === "CLOSED"
    ? L.closedAt(ddmm(p.closedAt))
    : deadline ? L.daysLeft(Math.ceil((new Date(deadline).getTime() - now) / DAY), ddmm(deadline)) : "";
  const ctx = { interviews: ivs.data ?? [], offers: offers.data ?? [], me, now };
  const rows = list
    .filter((a) => toFixedStage(a.currentStageType) === stage)
    .sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));

  return (
    <>
      {header}
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={queries.some((q) => q.isRefetching)} onRefresh={refetch} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <Card>
          <View style={styles.statusRow}>
            <StatusChip {...postingStatus(p.status)} />
            {when ? <Text style={styles.sub}>{when}</Text> : null}
          </View>
          <Text style={styles.title}>{p.title}</Text>
          <View style={styles.owner}>
            {owner ? <Avatar name={owner} size={SPACING.lg} /> : null}
            <Text style={styles.sub}>{L.owner(owner, p.headcount ?? 0, hired)}</Text>
          </View>
        </Card>

        <View style={styles.tiles}>
          {MAIN_STAGES.map((s) => {
            const on = s === stage;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${STAGE[s]} ${count(s)}`}
                onPress={() => setPicked(s)}
                style={[styles.tile, on && styles.tileOn]}
              >
                <Text style={[styles.tileValue, on && styles.tileTextOn]}>{count(s)}</Text>
                <Text style={[styles.tileLabel, on && styles.tileTextOn]} numberOfLines={1}>{STAGE[s]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listHead}>
          <Text style={styles.listTitle}>{L.list(STAGE[stage], rows.length)}</Text>
          {WEB_URL && list.length > 0 ? (
            <PillButton label={L.compare} variant="text" size="sm" onPress={() => void Linking.openURL(`${WEB_URL}/offers/compare?postingId=${p.id}`)} />
          ) : null}
        </View>
        {rows.length === 0 ? (
          <Text style={styles.sub}>{L.emptyStage}</Text>
        ) : (
          rows.map((a) => <CandidateCard key={a.id} app={a} area="hr" note={candidateNote(a, ctx)} />)
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  statusRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h3, color: COLORS.textPrimary },
  owner: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  tiles: { flexDirection: "row", gap: SPACING.xs },
  tile: { flex: 1, alignItems: "center", gap: SPACING.xxs, paddingVertical: SPACING.sm2, borderRadius: RADIUS.md, backgroundColor: COLORS.cardBg },
  tileOn: { backgroundColor: COLORS.primary },
  tileValue: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  tileLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.micro, color: COLORS.textSecondary },
  tileTextOn: { color: COLORS.textOnPrimary },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  listTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
});
