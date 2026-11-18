import { Fragment } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { jobSalary } from "@/features/jobs/job-card";
import { useAppliedJobs } from "@/features/applications/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, Divider } from "@/components/ui/surfaces";
import { WEB_URL } from "@/config";
import { Tag, ToneTag } from "@/components/ui/status-chip";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobDetail;

/**
 * Chi tiết việc làm — Redesign-Final `views.jobDetail`: khối đầu (phòng ban, tên vị trí, lưới 4 ô thông tin, tag),
 * thẻ Mô tả · Yêu cầu · Quyền lợi, thẻ "Thông tin ứng tuyển", nút "Ứng tuyển ngay" dính đáy. Nút chia sẻ gửi đường dẫn
 * trang tin trên web. Bỏ nút ♡ Lưu (backend không có) và không lặp tên vị trí hai lần như bản HTML.
 */
export default function JobDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const job = useJob(id);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScreenHeader
        variant="compact"
        back
        title={S.title}
        actions={
          job.data?.id != null && WEB_URL ? (
            <IconButton
              icon="link"
              label={S.share}
              onPress={() => {
                const url = `${WEB_URL}/careers/jobs/${job.data?.id}`;
                void Share.share({ message: `${job.data?.title ?? ""}\n${url}`, url });
              }}
            />
          ) : null
        }
      />
      {job.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : job.isError ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(job.error, "")} onRetry={() => void job.refetch()} />
        </View>
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
  const facts: { label: string; value: string; accent?: boolean }[] = [
    { label: S.salary, value: jobSalary(job), accent: true },
    { label: S.employmentType, value: job.employmentTypeName || "—" },
    { label: S.location, value: job.workLocationName || "—" },
    { label: S.experience, value: job.experienceRequired?.trim() || S.notSpecified },
  ];
  const tags = [
    job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null,
    job.applicationDeadline ? S.deadlineTag(formatDate(job.applicationDeadline)) : null,
    job.publishedAt ? S.postedOn(formatDate(job.publishedAt)) : null,
  ].filter(Boolean) as string[];
  const sections = [
    { title: S.description, content: job.description },
    { title: S.requirements, content: job.requirements },
    { title: S.benefits, content: job.benefits },
  ];

  return (
    <>
      {/* `.detailhero`: nền phớt màu thương hiệu. */}
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <View style={styles.flex}>
            {job.departmentName ? <Text style={styles.dept}>{job.departmentName}</Text> : null}
            <Text style={styles.jobTitle} accessibilityRole="header">
              {job.title}
            </Text>
          </View>
          {job.urgent ? <ToneTag label={STRINGS.jobs.urgent} tone="warning" /> : null}
        </View>
        <Divider />
        <View style={styles.facts}>
          {facts.map((f) => (
            <View key={f.label} style={styles.factCell}>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={[styles.factValue, f.accent && styles.factAccent]} numberOfLines={2}>
                  {f.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
        {tags.length ? (
          <View style={styles.tags}>
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        ) : null}
      </View>

      <Card>
        {sections.map((sec, i) => (
          <Fragment key={sec.title}>
            {i > 0 ? <Divider /> : null}
            <Text style={styles.subhead}>{sec.title}</Text>
            <Lines content={sec.content} />
          </Fragment>
        ))}
      </Card>

      <Card>
        <CardTitle right={<ToneTag label={S.applyOnline} tone="brand" />}>{S.applyInfo}</CardTitle>
        <Text style={styles.note}>{S.applyInfoNote}</Text>
      </Card>
    </>
  );
}

/**
 * Mô tả / yêu cầu / quyền lợi lưu văn bản thường (web hiển thị `pre-wrap`). Nhiều dòng → mỗi dòng một gạch đầu dòng
 * chấm màu thương hiệu; một dòng → đoạn văn; trống → "Thông tin đang được cập nhật."
 */
function Lines({ content }: { content?: string }) {
  const lines = (content ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*+]\s*/, ""))
    .filter(Boolean);
  if (!lines.length) return <Text style={[styles.body, styles.muted]}>{S.noInfo}</Text>;
  if (lines.length === 1) return <Text style={styles.body}>{lines[0]}</Text>;
  return (
    <View style={styles.lines}>
      {lines.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={[styles.body, styles.flex]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

/** Một nút dưới đáy. Đã nộp thì thành nút xem đơn ứng tuyển. */
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
          label={S.applyNow}
          iconRight="arrowRight"
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
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  flex: { flex: 1 },

  hero: {
    gap: SPACING.sm2,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: SIZES.border,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryFaint,
  },
  heroHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  dept: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    lineHeight: FONT_SIZE.h3 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  facts: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACING.xs },
  factCell: { width: "50%", padding: SPACING.xs },
  // `.infobox`: ô thông tin trắng nhỏ trong lưới 2×2.
  fact: {
    flex: 1,
    gap: SPACING.xxs,
    padding: SPACING.sm2 - SPACING.xxs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardBg,
  },
  factLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  factValue: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary },
  factAccent: { fontFamily: FONT.bold, color: COLORS.primary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },

  subhead: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  lines: { gap: SPACING.xs + SPACING.xxs },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  muted: { color: COLORS.textSecondary },
  bulletRow: { flexDirection: "row", gap: SPACING.sm2 },
  // Chấm đầu dòng, căn giữa dòng chữ đầu tiên.
  bulletDot: {
    width: SIZES.dot,
    height: SIZES.dot,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: (FONT_SIZE.base * LINE_HEIGHT.body - SIZES.dot) / 2,
  },
  note: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
});
