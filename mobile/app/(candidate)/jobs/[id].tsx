import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { useAppliedJobs, useApply } from "@/features/applications/hooks";
import { useRecruitmentSources } from "@/features/masterdata/hooks";
import { SourceSheet } from "@/features/applications/source-sheet";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, InfoNote, ListRow } from "@/components/ui/surfaces";
import { StatusChip, Tag } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { postingStatus } from "@/lib/status";
import { formatDate, formatSalary } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobDetail;

const schema = z.object({
  recruitmentSourceId: z.number({ error: S.sourceRequired }).int().positive(S.sourceRequired),
});
type FormValues = z.infer<typeof schema>;

/** M07 — Chi tiết tin + nộp đơn (B2). */
export default function JobDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const job = useJob(id);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.title} />

      {job.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : job.isError ? (
        <ErrorState message={apiErrorMessage(job.error, "")} onRetry={() => void job.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={job.isRefetching}
                onRefresh={() => void job.refetch()}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            <JobBody job={job.data} />
          </ScrollView>
          <ApplyBar job={job.data} />
        </>
      )}
    </View>
  );
}

function JobBody({ job }: { job: JobPostingResponse }) {
  const status = postingStatus(job.status);
  const arrangement = job.workArrangement ? STRINGS.arrangement[job.workArrangement] : undefined;
  const tags = [job.employmentTypeName, arrangement, job.workLocationName].filter(Boolean) as string[];

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroMeta}>
          <StatusChip {...status} />
          {job.departmentName ? <Text style={styles.department}>{job.departmentName}</Text> : null}
        </View>
        <Text style={styles.jobTitle} accessibilityRole="header">
          {job.title}
        </Text>
        {tags.length ? (
          <View style={styles.tags}>
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        ) : null}
      </View>

      <Card style={styles.factsCard}>
        <ListRow
          icon="money"
          title={S.salary}
          subtitle={`${formatSalary(job.salaryMin, job.salaryMax)}${
            job.salaryMin != null || job.salaryMax != null ? ` ${STRINGS.format.perMonth}` : ""
          }`}
        />
        <ListRow icon="star" title={S.experience} subtitle={job.experienceRequired || S.notSpecified} />
        <ListRow icon="calendar" title={S.published} subtitle={formatDate(job.publishedAt)} last />
      </Card>

      <TextSection title={S.description} content={job.description} />
      <TextSection title={S.requirements} content={job.requirements} />
      <TextSection title={S.benefits} content={job.benefits} />

      <InfoNote>{S.cvNote}</InfoNote>
    </>
  );
}

/**
 * Backend lưu mô tả/yêu cầu/quyền lợi là văn bản thường (web hiển thị `pre-wrap`). Dòng mở
 * đầu bằng "-", "•", "*" hoặc "+" thì vẽ thành gạch đầu dòng như canvas; dòng khác giữ nguyên.
 */
function TextSection({ title, content }: { title: string; content?: string }) {
  const lines = (content ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <View style={styles.lines}>
        {lines.map((line, i) => {
          const bullet = /^[-•*+]\s*/.test(line);
          const text = bullet ? line.replace(/^[-•*+]\s*/, "") : line;
          return bullet ? (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.body}>•</Text>
              <Text style={[styles.body, styles.bulletText]}>{text}</Text>
            </View>
          ) : (
            <Text key={i} style={styles.body}>
              {text}
            </Text>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * Thanh dưới đáy theo canvas M07: nút chọn nguồn + nút "Ứng tuyển". Đã nộp thì thay bằng
 * nút xem đơn. Nộp đơn không kèm file — backend lấy CV trong hồ sơ.
 */
function ApplyBar({ job }: { job: JobPostingResponse }) {
  const notify = useSnackbar();
  const applied = useAppliedJobs();
  const apply = useApply();
  const sources = useRecruitmentSources();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { control, handleSubmit, setValue } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const sourceId = useWatch({ control, name: "recruitmentSourceId" });
  const sourceName = sources.data?.find((s) => s.id === sourceId)?.name;

  const applicationId = job.id != null ? applied.get(job.id) : undefined;
  if (applicationId != null) {
    return (
      <BottomActionBar>
        <View style={styles.appliedLabel}>
          <StatusChip label={S.applied} tone="success" />
        </View>
        <PillButton
          label={S.viewApplication}
          variant="tonal"
          style={styles.flex}
          fullWidth
          onPress={() => router.push({ pathname: "/applications/[id]", params: { id: String(applicationId) } })}
        />
      </BottomActionBar>
    );
  }

  const isOpen = job.status === "OPEN";

  const onSubmit = handleSubmit(
    (values) => {
      if (job.id == null) return;
      apply.mutate(
        { jobPostingId: job.id, recruitmentSourceId: values.recruitmentSourceId },
        {
          onSuccess: () => {
            notify(S.success);
            router.navigate("/applications");
          },
          onError: (e) => {
            const msg = apiErrorMessage(e, S.failed);
            // Backend: "Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển" → dẫn
            // thẳng tới chỗ tải CV thay vì để người dùng tự đoán.
            const noCv = /\bCV\b/i.test(msg);
            notify(msg, noCv ? { label: S.uploadCv, onPress: () => router.navigate("/profile") } : undefined);
          },
        }
      );
    },
    // Chưa chọn nguồn → mở luôn sheet chọn nguồn thay vì báo lỗi suông.
    () => setSheetOpen(true)
  );

  return (
    <>
      <BottomActionBar>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={S.sourceSheetTitle}
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}
        >
          <Text style={[styles.selectText, !sourceName && styles.selectPlaceholder]} numberOfLines={1}>
            {sourceName ? S.source(sourceName) : S.pickSource}
          </Text>
          <Icon name="chevronDown" size={SIZES.iconSm} color={COLORS.textSecondary} />
        </Pressable>
        <PillButton
          label={S.apply}
          style={styles.flex}
          fullWidth
          loading={apply.isPending}
          // Không khóa nút khi tin đã đóng: bấm vào thì nói rõ lý do, thay vì một nút mờ câm.
          onPress={() => (isOpen ? void onSubmit() : notify(S.notOpen))}
        />
      </BottomActionBar>

      <SourceSheet
        visible={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
        selectedId={sourceId}
        onSelect={(id) => {
          setValue("recruitmentSourceId", id, { shouldValidate: true });
          setSheetOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, gap: SPACING.sm2 },

  hero: { gap: SPACING.sm + SPACING.xxs, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  department: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    // Một-lần: canvas M07 để tiêu đề tin 1.3 (giữa title 1.2 và body 1.45).
    lineHeight: FONT_SIZE.h2 * 1.3,
    color: COLORS.textPrimary,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },

  factsCard: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm2, gap: 0 },

  lines: { gap: SPACING.xs + SPACING.xxs },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  bulletRow: { flexDirection: "row", gap: SPACING.sm },
  bulletText: { flex: 1 },

  flex: { flex: 1 },
  appliedLabel: { flex: 1, justifyContent: "center" },
  select: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    height: SIZES.control,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill,
  },
  selectPressed: { backgroundColor: COLORS.fillStrong },
  selectText: { flex: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  selectPlaceholder: { color: COLORS.textSecondary },
});
