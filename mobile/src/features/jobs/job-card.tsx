import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Eyebrow } from "@/components/ui/surfaces";
import { Tag, ToneTag } from "@/components/ui/status-chip";
import { Icon } from "@/components/ui/icon";
import { STRINGS } from "@/lib/strings";
import { formatDate, formatSalary } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobs;

/** Lương hiển thị cho ứng viên: HR tắt "hiện lương" (`showSalary = false`) thì ghi "Thỏa thuận" như web. */
export function jobSalary(job: JobPostingResponse): string {
  return job.showSalary === false ? STRINGS.format.negotiable : formatSalary(job.salaryMin, job.salaryMax);
}

/**
 * Thẻ việc làm của Redesign-Final (`.job-card-premium`, bản phẳng): phòng ban + dòng nhỏ viết hoa, tên vị trí,
 * địa điểm · kinh nghiệm, kẻ ngang, mức lương và nhãn (Đã ứng tuyển / Tuyển gấp / Xem chi tiết), rồi các tag.
 * Dùng ở Trang chủ (vị trí nổi bật) và tab Việc làm.
 */
export function JobCard({ job, applied }: { job: JobPostingResponse; applied: boolean }) {
  const tags = [
    job.employmentTypeName,
    job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null,
    job.applicationDeadline ? S.deadlineShort(formatDate(job.applicationDeadline)) : null,
  ].filter(Boolean) as string[];

  return (
    <Card
      onPress={() => job.id != null && router.push({ pathname: "/jobs/[id]", params: { id: String(job.id) } })}
      accessibilityLabel={job.title}
      style={styles.card}
    >
      <View style={styles.top}>
        {job.departmentName ? (
          <Text style={styles.dept} numberOfLines={1}>
            {job.departmentName}
          </Text>
        ) : null}
        <Eyebrow tone={job.urgent ? "brand" : "muted"}>{job.urgent ? S.priority : S.receiving}</Eyebrow>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Icon name="pin" size={SIZES.iconXs} color={COLORS.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {job.workLocationName || S.locationFallback}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="clock" size={SIZES.iconXs} color={COLORS.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {job.experienceRequired?.trim() || S.experienceFallback}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.flex}>
          <Eyebrow>{S.salaryLabel}</Eyebrow>
          <Text style={styles.salary}>{jobSalary(job)}</Text>
        </View>
        {applied ? (
          <ToneTag label={S.appliedTag} tone="success" icon="check" />
        ) : job.urgent ? (
          <ToneTag label={S.urgent} tone="warning" />
        ) : (
          <View style={styles.link}>
            <Text style={styles.linkText}>{S.viewDetail}</Text>
            <Icon name="arrowRight" size={SIZES.iconXs} color={COLORS.primaryDark} strokeWidth={1.8} />
          </View>
        )}
      </View>

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.sm },
  flex: { flex: 1, gap: SPACING.xxs },
  top: { gap: SPACING.xxs },
  dept: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  meta: { flexDirection: "row", flexWrap: "wrap", columnGap: SPACING.sm2, rowGap: SPACING.xs },
  metaItem: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, maxWidth: "100%" },
  metaText: { flexShrink: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    paddingTop: SPACING.sm2,
    borderTopWidth: SIZES.hairline,
    borderTopColor: COLORS.divider,
  },
  salary: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.primary },
  link: { flexDirection: "row", alignItems: "center", gap: SPACING.xxs },
  linkText: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },
});
