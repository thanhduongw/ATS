import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { StatusChip } from "@/components/ui/status-chip";
import { useUnreadCount } from "@/features/notifications/hooks";
import { formatTime } from "@/lib/format";
import { interviewStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { InterviewResponse } from "@/types/api";
import { useMyId, useStaffInterviews, useStaffPostings } from "../hooks";
import { areaOf } from "../tasks";

const S = STRINGS.staff;
const L = S.schedule;
const DAY = 86_400_000;

/** Thứ Hai đầu tuần chứa `t` (00:00 giờ máy). */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // CN=6, T2=0
  return d.getTime() - shift * DAY;
}
const dayKey = (t: number) => new Date(t).toDateString();

type Row = { kind: "day"; key: string; label: string; count: number } | { kind: "iv"; key: string; iv: InterviewResponse };

/**
 * UR07 / UH04 · MÀN CHÍNH · Lịch phỏng vấn. Dải 7 ngày của tuần (chạm để lọc một ngày, chạm lại để xem cả
 * tuần), danh sách buổi nhóm theo ngày. Chuyên viên tuyển dụng thấy mọi buổi; Đại diện phòng ban chỉ buổi
 * mình được phân công (`?interviewerId`). Buổi đã huỷ không hiện.
 */
export function StaffInterviewsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const now = useNow();
  const unread = useUnreadCount();
  const ivs = useStaffInterviews();
  const postings = useStaffPostings();
  const [week, setWeek] = useState(() => weekStart(now));
  const [day, setDay] = useState<string | null>(null);

  const titleOf = useMemo(() => {
    const m = new Map<number, string>();
    (postings.data ?? []).forEach((p) => m.set(p.id ?? 0, p.title ?? ""));
    return m;
  }, [postings.data]);

  const inWeek = useMemo(
    () =>
      (ivs.data ?? [])
        .filter((iv) => iv.status !== "CANCELLED")
        .filter((iv) => {
          const t = new Date(iv.scheduledAt ?? 0).getTime();
          return t >= week && t < week + 7 * DAY;
        })
        .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()),
    [ivs.data, week],
  );

  const days = Array.from({ length: 7 }, (_, i) => week + i * DAY);
  const countOf = (t: number) => inWeek.filter((iv) => dayKey(new Date(iv.scheduledAt ?? 0).getTime()) === dayKey(t)).length;
  const shown = day ? inWeek.filter((iv) => dayKey(new Date(iv.scheduledAt ?? 0).getTime()) === day) : inWeek;

  const rows: Row[] = [];
  shown.forEach((iv) => {
    const t = new Date(iv.scheduledAt ?? 0).getTime();
    const k = dayKey(t);
    if (!rows.some((r) => r.kind === "day" && r.key === k)) {
      const d = new Date(t);
      const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const name = `${S.weekday[d.getDay()]} ${date}`;
      rows.push({
        kind: "day",
        key: k,
        label: k === dayKey(now) ? `${L.todayPrefix} · ${name}` : name,
        count: shown.filter((x) => dayKey(new Date(x.scheduledAt ?? 0).getTime()) === k).length,
      });
    }
    rows.push({ kind: "iv", key: `iv-${iv.id}`, iv });
  });

  const mid = new Date(week + 3 * DAY);
  const subtitle = isHr ? L.subtitleHr(`${mid.getMonth() + 1}/${mid.getFullYear()}`, inWeek.length) : L.subtitleHm;

  const strip = (
    <View style={styles.strip}>
      <View style={styles.flip}>
        <IconButton icon="chevronRight" label={L.prevWeek} onPress={() => { setWeek(week - 7 * DAY); setDay(null); }} />
      </View>
      <View style={styles.days}>
        {days.map((t) => {
          const d = new Date(t);
          const k = dayKey(t);
          const selected = day === k;
          const today = k === dayKey(now);
          const n = countOf(t);
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${S.weekday[d.getDay()]} ${d.getDate()}, ${L.dayCount(n)}`}
              onPress={() => setDay(selected ? null : k)}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{S.weekdayShort[d.getDay()]}</Text>
              <Text style={[styles.dayNum, today && styles.dayToday, selected && styles.dayTextSelected]}>{d.getDate()}</Text>
              <View style={[styles.dot, n === 0 && styles.dotHidden, selected && styles.dotSelected]} />
            </Pressable>
          );
        })}
      </View>
      <IconButton icon="chevronRight" label={L.nextWeek} onPress={() => { setWeek(week + 7 * DAY); setDay(null); }} />
    </View>
  );

  return (
    <>
      <ScreenHeader
        title={L.title}
        subtitle={subtitle}
        actions={<IconButton icon="bell" label={S.bell} badge={unread} onPress={() => router.push(`/${area}/notifications`)} />}
      />
      <QueryList
        query={ivs}
        data={rows}
        header={strip}
        keyExtractor={(r) => r.key}
        empty={day ? { title: L.emptyDayTitle, message: L.emptyDayMessage } : { title: L.emptyTitle, message: L.emptyMessage }}
        renderItem={({ item }) =>
          item.kind === "day" ? (
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{item.label}</Text>
              <Text style={styles.groupCount}>{L.dayCount(item.count)}</Text>
            </View>
          ) : (
            <InterviewRow iv={item.iv} me={me} now={now} isHr={isHr} area={area} title={titleOf.get(item.iv.jobPostingId ?? 0) ?? ""} />
          )
        }
      />
    </>
  );
}

function InterviewRow({ iv, me, now, isHr, area, title }: {
  iv: InterviewResponse; me: number; now: number; isHr: boolean; area: string; title: string;
}) {
  const start = new Date(iv.scheduledAt ?? 0).getTime();
  const end = start + (iv.durationMinutes ?? 60) * 60_000;
  const live = end > now && iv.format === "ONLINE" && !!iv.meetingLink && now > start - 15 * 60_000;
  const people = iv.interviewers ?? [];
  const mine = people.find((p) => p.interviewerId === me);
  const done = people.filter((p) => p.evaluationSubmitted).length;

  let status = interviewStatus(iv.status, "STAFF");
  if (!isHr && iv.status === "SCHEDULED" && mine) status = { label: L.waitYou, tone: "warning" };
  if (!isHr && mine?.evaluationSubmitted) status = { label: L.submitted(""), tone: "success" };
  if (isHr && iv.status === "EVALUATION_PENDING") status = { ...status, label: L.evalProgress(done, people.length) };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatTime(iv.scheduledAt)} ${iv.candidateName ?? ""}`}
      onPress={() => router.push({ pathname: `/${area}/interviews/[id]`, params: { id: String(iv.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.time}>
        <Text style={styles.timeText}>{formatTime(iv.scheduledAt)}</Text>
        <Text style={styles.sub}>{S.minutes(iv.durationMinutes ?? 60)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.person}>
          <Avatar name={iv.candidateName} size={SIZES.iconTile - SPACING.sm} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{iv.candidateName}</Text>
            {title ? <Text style={styles.sub} numberOfLines={1}>{title}</Text> : null}
          </View>
        </View>
        <View style={styles.meta}>
          <View style={styles.faces}>
            {people.slice(0, 3).map((p) => (
              <Avatar key={p.interviewerId} name={p.fullName} size={SPACING.lg} />
            ))}
          </View>
          <Icon name={iv.format === "ONLINE" ? "video" : "briefcase"} size={FONT_SIZE.base} color={COLORS.textSecondary} />
          <Text style={styles.sub} numberOfLines={1}>{iv.format === "ONLINE" ? S.online : S.onsite}</Text>
        </View>
        <View style={styles.footer}>
          <StatusChip {...status} />
          {live ? <PillButton label={L.join} size="sm" onPress={() => void Linking.openURL(iv.meetingLink ?? "")} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: SPACING.sm },
  days: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: SPACING.xxs, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, flex: 1 },
  daySelected: { backgroundColor: COLORS.primary },
  dayName: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  dayNum: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  dayToday: { color: COLORS.primaryDark },
  dayTextSelected: { color: COLORS.cardBg },
  dot: { width: SPACING.xs, height: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  dotHidden: { opacity: 0 },
  dotSelected: { backgroundColor: COLORS.cardBg },
  flip: { transform: [{ scaleX: -1 }] }, // bộ icon chỉ có chevronRight → lật ngang làm mũi tên sang trái
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: SPACING.sm },
  groupTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  groupCount: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  card: { flexDirection: "row", gap: SPACING.sm2, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardPressed: { opacity: 0.85 },
  time: { width: SPACING.xxl, gap: SPACING.xxs },
  timeText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  body: { flex: 1, gap: SPACING.sm },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  meta: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  faces: { flexDirection: "row", gap: SPACING.xxs, marginRight: SPACING.xs },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
});
