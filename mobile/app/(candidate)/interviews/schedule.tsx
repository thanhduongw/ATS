import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarkSlotAvailable, useMyPendingSlots } from "@/features/interviews/hooks";
import { useApplicationsById } from "@/features/applications/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { InfoNote } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { formatDate, formatTime } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { InterviewSlot } from "@/types/api";

const S = STRINGS.schedule;

const schema = z.object({ slotId: z.number({ error: S.pickFirst }).int().positive(S.pickFirst) });
type Values = z.infer<typeof schema>;

/** "2026-09-29" theo giờ máy — khóa nhóm khung giờ theo ngày. */
const dayKey = (iso?: string) => {
  const d = new Date(iso ?? 0);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const minutesOf = (s: InterviewSlot) =>
  s.startTime && s.endTime ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000) : undefined;

/**
 * Chọn giờ phỏng vấn — giao diện canvas Mobile v2 N31 (hàng ngày + lưới giờ).
 *
 * Khác canvas ở ý nghĩa nút: ứng viên KHÔNG tự chốt lịch được (`/slots/{id}/select` chỉ HR gọi);
 * bấm nút là báo "rảnh giờ này" (`/slots/{id}/confirm {available:true}`), HR chốt sau. Vì vậy nút
 * ghi "Báo rảnh…" chứ không ghi "Xác nhận…".
 */
export default function ScheduleScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId?: string }>();
  const appId = applicationId ? Number(applicationId) : undefined;
  const slots = useMyPendingSlots();
  const apps = useApplicationsById();
  const mark = useMarkSlotAvailable();
  const notify = useSnackbar();
  const insets = useSafeAreaInsets();

  const mine = useMemo(
    () =>
      (slots.data ?? [])
        .filter((s) => s.id != null && s.startTime && (appId == null || s.applicationId === appId))
        .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()),
    [slots.data, appId]
  );
  const days = useMemo(() => {
    const map = new Map<string, InterviewSlot[]>();
    for (const s of mine) map.set(dayKey(s.startTime), [...(map.get(dayKey(s.startTime)) ?? []), s]);
    return [...map.entries()];
  }, [mine]);

  const [day, setDay] = useState<string>();
  const activeDay = days.some(([k]) => k === day) ? day : days[0]?.[0];
  const daySlots = days.find(([k]) => k === activeDay)?.[1] ?? [];

  const { control, handleSubmit, setValue, reset } = useForm<Values>({ resolver: zodResolver(schema) });
  const slotId = useWatch({ control, name: "slotId" });
  const picked = mine.find((s) => s.id === slotId);

  const job = appId != null ? apps.get(appId)?.jobTitle : mine[0] && apps.get(mine[0].applicationId!)?.jobTitle;
  const weekday = (iso?: string) => S.weekdayShort[new Date(iso ?? 0).getDay()];

  const onSubmit = handleSubmit(
    (v) =>
      mark.mutate(v.slotId, {
        onSuccess: () => {
          notify(S.done);
          reset({});
          // Báo xong khung giờ cuối cùng thì quay về — không để lại một màn trống.
          if (mine.length <= 1) router.back();
        },
        onError: (e) => notify(apiErrorMessage(e, S.failed)),
      }),
    () => notify(S.pickFirst)
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        back
        title={S.title}
        subtitle={[job, S.subtitle(mine[0] ? minutesOf(mine[0]) : undefined)].filter(Boolean).join(" · ")}
      />
      {slots.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : slots.isError ? (
        <ErrorState message={apiErrorMessage(slots.error, "")} onRetry={() => void slots.refetch()} />
      ) : !mine.length ? (
        <EmptyState
          icon="calendar"
          title={S.emptyTitle}
          message={S.emptyMessage}
          action={{ label: S.back, onPress: () => router.navigate("/interviews") }}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map(([k, list]) => {
                const selected = k === activeDay;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={formatDate(list[0]!.startTime)}
                    onPress={() => setDay(k)}
                    style={[styles.day, selected && styles.daySelected]}
                  >
                    <Text style={[styles.dayWeek, selected && styles.onPrimary]}>{weekday(list[0]!.startTime)}</Text>
                    <Text style={[styles.dayNum, selected && styles.onPrimary]}>
                      {formatDate(list[0]!.startTime).slice(0, 2)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.timeGrid}>
              {daySlots.map((s) => {
                const selected = s.id === slotId;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setValue("slotId", s.id!, { shouldValidate: true })}
                    style={[styles.time, selected && styles.timeSelected]}
                  >
                    <Text style={[styles.timeText, selected && styles.onPrimary]}>{formatTime(s.startTime)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <InfoNote>{S.hint}</InfoNote>
          </ScrollView>

          <BottomActionBar>
            <PillButton
              label={
                picked
                  ? S.submit(formatTime(picked.startTime), `${weekday(picked.startTime)} ${formatDate(picked.startTime).slice(0, 5)}`)
                  : S.pickFirst
              }
              fullWidth
              style={styles.flex}
              disabled={!picked}
              loading={mark.isPending}
              onPress={() => void onSubmit()}
            />
          </BottomActionBar>
        </>
      )}
    </View>
  );
}

const DAY_W = SIZES.otpHeight;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1 },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.sm, gap: SPACING.md },
  dayRow: { gap: SPACING.sm },
  day: {
    width: DAY_W,
    paddingVertical: SPACING.sm2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.cardBg,
    alignItems: "center",
    gap: SPACING.xxs,
  },
  daySelected: { backgroundColor: COLORS.primary },
  dayWeek: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  dayNum: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h3, color: COLORS.textPrimary },
  onPrimary: { color: COLORS.textOnPrimary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  time: {
    // 3 cột trên điện thoại: trừ 2 khoảng cách rồi chia 3.
    width: "31%",
    height: SIZES.control,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSelected: { backgroundColor: COLORS.primary },
  timeText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
});
