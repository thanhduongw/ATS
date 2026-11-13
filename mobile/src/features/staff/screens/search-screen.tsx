import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiErrorMessage } from "@/api/client";
import { IconButton } from "@/components/ui/buttons";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-and-filters";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, IconTile } from "@/components/ui/surfaces";
import { useDepartmentNames } from "@/features/masterdata/hooks";
import { formatDate, normalizeForSearch } from "@/lib/format";
import { requisitionStatus } from "@/lib/status";
import { recentSearchStorage } from "@/lib/storage";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";
import { CandidateCard } from "../candidate-card";
import { useMyId, useStaffApplications, useStaffInterviews, useStaffOffers, useStaffPostings, useStaffRequisitions } from "../hooks";
import { candidateNote } from "../notes";

const L = STRINGS.staff.search;
const MAX = 20;
const code = (id?: number) => `REQ-${String(id ?? 0).padStart(3, "0")}`;
const ddmm = (iso?: string) => (iso ? formatDate(iso).slice(0, 5) : "");

/**
 * UR18 · Tìm kiếm (chỉ Chuyên viên tuyển dụng): ứng viên theo tên, việc làm theo tên, yêu cầu tuyển dụng theo
 * tên hoặc mã REQ. Tìm ở client trên dữ liệu đã tải (backend không có API tìm chung). "Tìm gần đây" lưu ở máy,
 * xoá khi đăng xuất. Hồ sơ ứng tuyển không có email / số điện thoại nên không tìm theo hai trường này.
 */
export function StaffSearchScreen() {
  const insets = useSafeAreaInsets();
  const me = useMyId();
  const now = useNow();
  const apps = useStaffApplications();
  const postings = useStaffPostings();
  const reqs = useStaffRequisitions();
  const ivs = useStaffInterviews();
  const offers = useStaffOffers();
  const depts = useDepartmentNames();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    void recentSearchStorage.read().then(setRecent);
  }, []);
  const remember = () => {
    if (q.trim()) void recentSearchStorage.push(q).then(setRecent);
  };

  const queries = [apps, postings, reqs];
  const refetch = () => void Promise.all([...queries, ivs, offers].map((x) => x.refetch()));
  const k = normalizeForSearch(q.trim());
  const has = (s?: string) => !!s && normalizeForSearch(s).includes(k);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm2 }]}>
      <IconButton icon="back" label={STRINGS.common.back} onPress={() => router.back()} />
      <View style={styles.flex}>
        <SearchField value={q} onChangeText={setQ} placeholder={L.placeholder} autoFocus onSubmitEditing={remember} />
      </View>
    </View>
  );

  const recentRow = recent.length > 0 ? (
    <View style={styles.section}>
      <Text style={styles.group}>{L.recent}</Text>
      <View style={styles.chips}>
        {recent.map((r) => (
          <Pressable key={r} accessibilityRole="button" onPress={() => setQ(r)} style={styles.chip} hitSlop={SPACING.xs}>
            <Icon name="clock" size={SIZES.iconSm} color={COLORS.textSecondary} />
            <Text style={styles.chipText} numberOfLines={1}>{r}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  ) : null;

  const failed = queries.find((x) => x.isError);
  let body;
  if (queries.some((x) => x.isPending)) body = <SkeletonList />;
  else if (failed) body = <ErrorState message={apiErrorMessage(failed.error)} onRetry={refetch} />;
  else if (!k) body = (<>{recentRow}<EmptyState icon="search" title={L.hintTitle} message={L.hint} /></>);
  else {
    const ctx = { interviews: ivs.data ?? [], offers: offers.data ?? [], me, now };
    const cands = (apps.data ?? []).filter((a) => has(a.candidateName))
      .sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1)).slice(0, MAX);
    const jobs = (postings.data ?? []).filter((p) => p.status !== "DRAFT" && has(p.title)).slice(0, MAX);
    const reqList = (reqs.data ?? []).filter((r) => r.status !== "DRAFT" && (has(r.title) || has(code(r.id)))).slice(0, MAX);
    body = cands.length + jobs.length + reqList.length === 0 ? (
      <>{recentRow}<EmptyState icon="search" title={L.emptyTitle} message={L.emptyMessage(q.trim())} /></>
    ) : (
      <>
        {recentRow}
        {cands.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.group}>{L.candidates(cands.length)}</Text>
            {cands.map((a) => (
              <CandidateCard key={a.id} app={a} area="hr" note={candidateNote(a, ctx)} onOpen={remember} />
            ))}
          </View>
        ) : null}
        {jobs.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.group}>{L.jobs(jobs.length)}</Text>
            <Card>
              {jobs.map((p) => <JobRow key={p.id} p={p} onPress={() => { remember(); router.push({ pathname: "/hr/jobs/[id]", params: { id: String(p.id) } }); }} />)}
            </Card>
          </View>
        ) : null}
        {reqList.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.group}>{L.requisitions(reqList.length)}</Text>
            <Card>
              {reqList.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  onPress={() => { remember(); router.push({ pathname: "/hr/requisitions/[id]", params: { id: String(r.id) } }); }}
                  style={styles.row}
                >
                  <IconTile icon="document" />
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{[code(r.id), depts.get(r.departmentId ?? 0)].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <StatusChip {...requisitionStatus(r.status)} />
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <>
      {header}
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={queries.some((x) => x.isRefetching)} onRefresh={refetch} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {body}
      </ScrollView>
    </>
  );
}

function JobRow({ p, onPress }: { p: JobPostingResponse; onPress: () => void }) {
  const sub = [p.departmentName, p.status === "CLOSED" ? L.closedOn(ddmm(p.closedAt)) : STRINGS.status.posting[p.status ?? "OPEN"]]
    .filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <IconTile icon="briefcase" />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>{p.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <Icon name="chevronRight" size={FONT_SIZE.md} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SPACING.page, paddingBottom: SPACING.sm, backgroundColor: COLORS.body },
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.md, paddingBottom: SPACING.xl },
  flex: { flex: 1 },
  section: { gap: SPACING.sm },
  group: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, maxWidth: "100%", paddingHorizontal: SPACING.sm2, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.cardBg },
  chipText: { flexShrink: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.xs },
  rowTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
});
