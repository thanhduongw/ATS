import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { useAppliedJobs } from "@/features/applications/hooks";
import { usePipelineStages } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle } from "@/components/ui/surfaces";
import { Tag } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { formatSalary } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobDetail;

/** Chi tiết tin (B2) — giao diện canvas Mobile v2 N27. Nút "Ứng tuyển nhanh" mở màn N28. */
export default function JobDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const job = useJob(id);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title="" />
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
  const stages = usePipelineStages(job.pipelineId);
  const place = [job.workLocationName, job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null]
    .filter(Boolean)
    .join(" · ");
  const tags = [
    place,
    STRINGS.jobs.salaryShort(formatSalary(job.salaryMin, job.salaryMax)),
    job.experienceRequired,
    job.employmentTypeName,
  ].filter(Boolean) as string[];

  return (
    <>
      <View style={styles.hero}>
        {job.departmentName ? <Text style={styles.department}>{job.departmentName}</Text> : null}
        <Text style={styles.jobTitle} accessibilityRole="header">
          {job.title}
        </Text>
        <View style={styles.tags}>
          {tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      </View>

      <TextSection title={S.description} content={job.description} />
      <TextSection title={S.requirements} content={job.requirements} />
      <TextSection title={S.benefits} content={job.benefits} />

      {stages.data?.length ? (
        <Card>
          <CardTitle>{S.process}</CardTitle>
          <View style={styles.tags}>
            {stages.data.map((st, i) => (
              <Tag key={st.id ?? i} label={`${i + 1}. ${st.name ?? ""}`} />
            ))}
          </View>
        </Card>
      ) : null}
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

/** Một nút duy nhất dưới đáy (canvas N27). Đã nộp thì thành nút xem hồ sơ ứng tuyển. */
function ApplyBar({ job }: { job: JobPostingResponse }) {
  const notify = useSnackbar();
  const applied = useAppliedJobs();
  const applicationId = job.id != null ? applied.get(job.id) : undefined;

  return (
    <BottomActionBar>
      {applicationId != null ? (
        <PillButton
          label={S.viewMyApplication}
          variant="tonal"
          fullWidth
          style={styles.flex}
          onPress={() => router.push({ pathname: "/applications/[id]", params: { id: String(applicationId) } })}
        />
      ) : (
        <PillButton
          label={S.quickApply}
          icon="send"
          fullWidth
          style={styles.flex}
          // Không khóa nút khi tin đã đóng: bấm vào thì nói rõ lý do, thay vì một nút mờ câm.
          onPress={() =>
            job.status === "OPEN"
              ? router.push({ pathname: "/jobs/apply", params: { jobId: String(job.id) } })
              : notify(S.notOpen)
          }
        />
      )}
    </BottomActionBar>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, gap: SPACING.sm2 },
  flex: { flex: 1 },

  hero: { gap: SPACING.sm, paddingTop: SPACING.xs, paddingBottom: SPACING.xs },
  department: { fontFamily: FONT.medium, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    // Một-lần: canvas để tiêu đề tin 1.3 (giữa title 1.2 và body 1.45).
    lineHeight: FONT_SIZE.h2 * 1.3,
    color: COLORS.textPrimary,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },

  lines: { gap: SPACING.xs + SPACING.xxs },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  bulletRow: { flexDirection: "row", gap: SPACING.sm },
  bulletText: { flex: 1 },
});
