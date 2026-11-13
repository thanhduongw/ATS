import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/ui/avatar";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips } from "@/components/ui/search-and-filters";
import { StatusChip } from "@/components/ui/status-chip";
import { useDepartmentNames } from "@/features/masterdata/hooks";
import { formatSalary } from "@/lib/format";
import { toFixedStage } from "@/lib/stages";
import { requisitionStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import type { RequisitionResponse } from "@/types/api";
import { useMyId, useStaffApplications, useStaffPostings, useStaffRequisitions } from "../hooks";
import { areaOf } from "../tasks";

const L = STRINGS.staff.requisitions;
const F = L.filters;

type HrKey = "PENDING" | "CHANGES" | "APPROVED" | "ALL";
type HmKey = "ALL" | "FIX" | "DRAFT" | "APPROVED" | "REJECTED";
const HR_MATCH: Record<HrKey, (r: RequisitionResponse) => boolean> = {
  PENDING: (r) => r.status === "PENDING_APPROVAL",
  CHANGES: (r) => r.status === "CHANGES_REQUESTED",
  APPROVED: (r) => r.status === "APPROVED",
  ALL: () => true,
};
const HM_MATCH: Record<HmKey, (r: RequisitionResponse) => boolean> = {
  ALL: () => true,
  FIX: (r) => r.status === "CHANGES_REQUESTED",
  DRAFT: (r) => r.status === "DRAFT",
  APPROVED: (r) => r.status === "APPROVED",
  REJECTED: (r) => r.status === "REJECTED",
};

/** "REQ-031" (cùng cách đánh mã với web). */
const code = (id?: number) => `REQ-${String(id ?? 0).padStart(3, "0")}`;
const ddmm = (iso?: string) => {
  const d = new Date(iso ?? 0);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * UR11 / UH12 · Yêu cầu tuyển dụng. Chuyên viên tuyển dụng: chỉ xem và lọc (duyệt trên máy tính), không thấy
 * bản nháp của phòng ban. Đại diện phòng ban: yêu cầu của mình; dòng phụ là góp ý (Cần sửa), số đã tuyển (Đã duyệt)
 * hoặc lý do từ chối. Nợ kỹ thuật: backend chưa lưu ngày gửi duyệt → "Gửi …" dùng ngày tạo.
 */
export function StaffRequisitionsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const reqs = useStaffRequisitions();
  const postings = useStaffPostings();
  const apps = useStaffApplications();
  const depts = useDepartmentNames();
  const [hrKey, setHrKey] = useState<HrKey>("PENDING");
  const [hmKey, setHmKey] = useState<HmKey>("ALL");

  const base = useMemo(
    () =>
      (reqs.data ?? [])
        .filter((r) => (isHr ? r.status !== "DRAFT" : r.requesterId === me))
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [reqs.data, isHr, me],
  );

  const hiredOf = (r: RequisitionResponse) => {
    const ids = new Set((postings.data ?? []).filter((p) => p.requisitionId === r.id).map((p) => p.id));
    return (apps.data ?? []).filter((a) => ids.has(a.jobPostingId) && toFixedStage(a.currentStageType) === "HIRED").length;
  };

  const chips = isHr
    ? (Object.keys(HR_MATCH) as HrKey[]).map((k) => ({ key: k, label: L.chip(F[k], base.filter(HR_MATCH[k]).length) }))
    : (Object.keys(HM_MATCH) as HmKey[]).map((k) => ({ key: k, label: L.chip(F[k], base.filter(HM_MATCH[k]).length) }));
  const shown = base.filter(isHr ? HR_MATCH[hrKey] : HM_MATCH[hmKey]);
  const dept = !isHr ? (depts.get(base[0]?.departmentId ?? 0) ?? "") : "";

  return (
    <>
      <ScreenHeader variant="compact" back title={L.title} subtitle={dept || undefined} />
      <QueryList
        query={reqs}
        data={shown}
        keyExtractor={(r) => String(r.id)}
        header={
          isHr ? (
            <FilterChips options={chips as { key: HrKey; label: string }[]} value={hrKey} onChange={setHrKey} />
          ) : (
            <FilterChips options={chips as { key: HmKey; label: string }[]} value={hmKey} onChange={setHmKey} />
          )
        }
        empty={{ title: L.emptyTitle, message: L.emptyMessage }}
        renderItem={({ item: r }) => {
          const status = requisitionStatus(r.status);
          if (isHr && r.status === "CHANGES_REQUESTED") status.label = L.changesLabel;
          const salary = r.expectedSalaryMin != null || r.expectedSalaryMax != null ? formatSalary(r.expectedSalaryMin, r.expectedSalaryMax) : "";
          const meta = isHr
            ? [code(r.id), depts.get(r.departmentId ?? 0), L.people(r.quantity ?? 0), salary].filter(Boolean).join(" · ")
            : [code(r.id), L.people(r.quantity ?? 0), r.status === "DRAFT" ? L.notSent : L.sentLower(ddmm(r.createdAt))].join(" · ");
          const extra = isHr ? null
            : r.status === "CHANGES_REQUESTED" && r.hrNote ? L.hrNote(r.hrNote)
              : r.status === "APPROVED" ? L.hired(hiredOf(r), r.quantity ?? 0)
                : r.status === "REJECTED" && r.rejectReason ? r.rejectReason
                  : null;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: `/${area}/requisitions/[id]`, params: { id: String(r.id) } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.top}>
                <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
                <StatusChip {...status} />
              </View>
              <Text style={styles.sub}>{meta}</Text>
              {isHr ? (
                <View style={styles.person}>
                  <Avatar name={r.requesterName} size={SPACING.lg} />
                  <Text style={[styles.sub, styles.flex]} numberOfLines={1}>{r.requesterName}</Text>
                  <Text style={styles.sub}>{L.sent(ddmm(r.createdAt))}</Text>
                </View>
              ) : extra ? (
                <Text style={[styles.extra, r.status === "CHANGES_REQUESTED" && styles.extraWarn]} numberOfLines={2}>{extra}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  pressed: { opacity: 0.85 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  title: { flex: 1, fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  flex: { flex: 1 },
  extra: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  extraWarn: { color: COLORS.warning },
});
