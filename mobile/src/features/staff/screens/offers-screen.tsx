import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips } from "@/components/ui/search-and-filters";
import { StatusChip } from "@/components/ui/status-chip";
import { InfoNote, KeyValueRow } from "@/components/ui/surfaces";
import { formatDate, formatDaysLeft, formatMoney, formatTime } from "@/lib/format";
import { offerStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import type { OfferResponse } from "@/types/api";
import { useStaffOffers } from "../hooks";

const L = STRINGS.staff.offers;
type Key = keyof typeof L.filters;
const MATCH: Record<Key, (o: OfferResponse) => boolean> = {
  ALL: () => true,
  DRAFT: (o) => o.status === "DRAFT",
  SENT: (o) => o.status === "APPROVED",
  ACCEPTED: (o) => o.status === "ACCEPTED",
  DECLINED: (o) => o.status === "DECLINED",
};
const ddmm = (iso?: string) => (iso ? formatDate(iso).slice(0, 5) : "");

/**
 * UR16 · Thư mời (chỉ Chuyên viên tuyển dụng) · UR17 bảng trượt chi tiết. Mobile chỉ xem và gọi ứng viên — soạn,
 * sửa, thu hồi làm trên máy tính (DS06). Nợ kỹ thuật: HTML có "Nhắc phản hồi" nhưng backend chưa có API nhắc → bỏ.
 */
export function StaffOffersScreen() {
  const offers = useStaffOffers();
  const now = useNow();
  const [key, setKey] = useState<Key>("ALL");
  const [open, setOpen] = useState<OfferResponse | null>(null);

  const list = useMemo(
    () => [...(offers.data ?? [])].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [offers.data],
  );
  const chips = (Object.keys(MATCH) as Key[]).map((k) => ({ key: k, label: `${L.filters[k]} ${list.filter(MATCH[k]).length}` }));

  const when = (o: OfferResponse) => {
    if (o.status === "DRAFT") return L.notSent;
    if (o.status === "APPROVED") return L.deadline(ddmm(o.responseDeadline), formatDaysLeft(o.responseDeadline, new Date(now)) ?? "");
    if (o.status === "ACCEPTED") {
      const started = !!o.startDate && new Date(o.startDate).getTime() <= now;
      return started ? L.started(ddmm(o.startDate)) : L.starts(ddmm(o.startDate));
    }
    return ddmm(o.candidateRespondedAt ?? o.createdAt);
  };

  return (
    <>
      <ScreenHeader variant="compact" back title={L.title} />
      <QueryList
        query={offers}
        data={list.filter(MATCH[key])}
        keyExtractor={(o) => String(o.id)}
        header={<FilterChips options={chips} value={key} onChange={setKey} />}
        empty={{ title: L.emptyTitle, message: L.emptyMessage }}
        renderItem={({ item: o }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${o.candidateName ?? ""} ${o.jobTitle ?? ""}`}
            onPress={() => setOpen(o)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Avatar name={o.candidateName} />
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.name} numberOfLines={1}>{o.candidateName}</Text>
                <StatusChip {...offerStatus(o.status, "STAFF")} />
              </View>
              <Text style={styles.sub} numberOfLines={1}>{o.jobTitle}</Text>
              <View style={styles.top}>
                <Text style={styles.money}>{formatMoney(o.salaryOffered)}</Text>
                <Text style={styles.sub}>{when(o)}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <BottomSheet
        visible={!!open}
        onDismiss={() => setOpen(null)}
        title={open?.candidateName ?? ""}
        subtitle={open?.jobTitle}
        footer={
          open?.candidatePhone ? (
            <PillButton label={L.call} variant="tonal" icon="person" fullWidth onPress={() => void Linking.openURL(`tel:${open.candidatePhone}`)} />
          ) : undefined
        }
      >
        {open ? (
          <>
            <View style={styles.statusRow}>
              <StatusChip {...(open.status === "APPROVED" ? { label: L.waiting, tone: "brand" as const } : offerStatus(open.status, "STAFF"))} />
              {open.status === "APPROVED" && open.responseDeadline ? (
                <Text style={styles.sub}>{L.deadlineAt(`${ddmm(open.responseDeadline)} ${formatTime(open.responseDeadline)}`)}</Text>
              ) : null}
            </View>
            <KeyValueRow label={L.salary} value={formatMoney(open.salaryOffered)} />
            <KeyValueRow label={L.start} value={formatDate(open.startDate)} />
            {open.issuedAt ? <KeyValueRow label={L.sentAt} value={`${ddmm(open.issuedAt)} · ${formatTime(open.issuedAt)}`} /> : null}
            {open.status === "APPROVED" ? (
              <KeyValueRow
                label={L.viewed}
                value={open.candidateViewCount
                  ? L.viewedAt(`${ddmm(open.candidateLastViewedAt)} ${formatTime(open.candidateLastViewedAt)}`, open.candidateViewCount)
                  : L.notViewed}
                last
              />
            ) : null}
            {open.status === "DECLINED" && open.declineReasonName ? (
              <KeyValueRow label={L.declineReason} value={open.declineReasonName} last />
            ) : null}
            <InfoNote>{L.desktop}</InfoNote>
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: SPACING.sm2, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: SPACING.xs },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  name: { flex: 1, fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  money: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
});
