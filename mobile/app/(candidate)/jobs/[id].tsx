import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { useAppliedJobs } from "@/features/applications/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, IconTile } from "@/components/ui/surfaces";
import { Icon, type IconName } from "@/components/ui/icon";
import { WEB_URL } from "@/config";
import { ToneTag } from "@/components/ui/status-chip";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { formatDate, formatSalary } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobDetail;

/**
 * UC02 · Chi tiết việc làm (Mobile.html): thẻ đầu + lưới thông tin, "Về công việc" (mô tả, yêu cầu), "Phúc lợi",
 * nút "Ứng tuyển ngay" mở UC18. Nút chia sẻ gửi đường dẫn trang tin trên web. Khác HTML: không có ♡ lưu tin
 * (backend chưa có); bỏ ô "Quy trình" như web (quyết định 13/11/2026).
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
        title=""
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
  const place = [job.workLocationName, job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null]
    .filter(Boolean)
    .join(" · ");
  const facts: { icon: IconName; label: string; value?: string | null }[] = [
    { icon: "money", label: S.salary, value: formatSalary(job.salaryMin, job.salaryMax) },
    { icon: "briefcase", label: S.experience, value: job.experienceRequired?.trim() || S.notSpecified },
    { icon: "clock", label: S.employmentType, value: job.employmentTypeName },
    { icon: "calendar", label: S.deadline, value: job.applicationDeadline ? formatDate(job.applicationDeadline) : null },
  ];
  const benefits = splitItems(job.benefits);

  return (
    <>
      {/* UC02: thẻ đầu — nhãn, tên việc, địa điểm, lưới 2×2 ô thông tin. */}
      <Card>
        {job.departmentName || job.urgent ? (
          <View style={styles.tags}>
            {job.departmentName ? <ToneTag label={job.departmentName} tone="brand" /> : null}
            {job.urgent ? <ToneTag label={STRINGS.jobs.urgent} tone="danger" /> : null}
          </View>
        ) : null}
        <Text style={styles.jobTitle} accessibilityRole="header">
          {job.title}
        </Text>
        {place ? (
          <View style={styles.meta}>
            <Icon name="pin" size={SIZES.iconXs} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{place}</Text>
          </View>
        ) : null}
        <View style={styles.facts}>
          {facts
            .filter((f) => f.value)
            .map((f) => (
              <View key={f.label} style={styles.fact}>
                <IconTile icon={f.icon} size={SIZES.iconTile} />
                <View style={styles.flex}>
                  <Text style={styles.factLabel}>{f.label}</Text>
                  <Text style={styles.factValue} numberOfLines={2}>
                    {f.value}
                  </Text>
                </View>
              </View>
            ))}
        </View>
      </Card>

      {job.description?.trim() || job.requirements?.trim() ? (
        <Card>
          <CardTitle>{S.about}</CardTitle>
          <Lines content={job.description} />
          {job.requirements?.trim() ? (
            <>
              <Text style={styles.subhead}>{S.requirements}</Text>
              <Lines content={job.requirements} />
            </>
          ) : null}
        </Card>
      ) : null}

      {benefits.length ? (
        <Card>
          <CardTitle>{S.benefits}</CardTitle>
          <View style={styles.tags}>
            {benefits.map((b) => (
              <ToneTag key={b} label={b} tone="neutral" icon="check" />
            ))}
          </View>
        </Card>
      ) : null}
    </>
  );
}

/** Phúc lợi lưu chữ thường: tách theo dòng / dấu chấm phẩy thành từng chip. */
function splitItems(text?: string) {
  return (text ?? "")
    .split(/\r?\n|;/)
    .map((l) => l.trim().replace(/^[-•*+]\s*/, ""))
    .filter(Boolean);
}

/**
 * Mô tả / yêu cầu lưu văn bản thường (web hiển thị `pre-wrap`). Nhiều dòng → mỗi dòng một gạch đầu dòng chấm xanh
 * như UC02; một dòng → đoạn văn.
 */
function Lines({ content }: { content?: string }) {
  const lines = (content ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*+]\s*/, ""))
    .filter(Boolean);
  if (!lines.length) return null;
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
          label={S.applyNow}
          icon="arrowRight"
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
  bulletRow: { flexDirection: "row", gap: SPACING.sm2 },
  // Chấm xanh đầu dòng UC02, căn giữa dòng chữ đầu tiên.
  bulletDot: {
    width: SIZES.dot,
    height: SIZES.dot,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: (FONT_SIZE.md * LINE_HEIGHT.body - SIZES.dot) / 2,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  metaText: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: SPACING.sm2, marginTop: SPACING.xs },
  fact: { width: "50%", flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingRight: SPACING.sm },
  factLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  factValue: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  subhead: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary, marginTop: SPACING.xs },
});
