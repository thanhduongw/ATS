import { useMemo, useState } from "react";
import { SectionList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenJobs } from "@/features/jobs/hooks";
import { useAppliedJobs } from "@/features/applications/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { apiErrorMessage } from "@/api/client";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips, SearchField, type ChipOption } from "@/components/ui/search-and-filters";
import { BrandMark, Card } from "@/components/ui/surfaces";
import { StatusChip, Tag } from "@/components/ui/status-chip";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { formatSalary, normalizeForSearch } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobs;
const ALL = "all";
const REMOTE = "remote";

type Scored = { job: JobPostingResponse; matched: number; total: number };

/**
 * Việc làm (B1) — giao diện canvas Mobile v2 N26.
 * Endpoint công khai trả CẢ mảng, không có keyword/phân trang → tìm kiếm, lọc, xếp hạng ở client.
 *
 * "Phù hợp với bạn": so `skillIds` của tin với kỹ năng trong hồ sơ — tin khớp ít nhất một kỹ
 * năng lên nhóm đầu, xếp theo số kỹ năng khớp. Hồ sơ chưa có kỹ năng thì không chia nhóm.
 */
export default function JobsScreen() {
  const query = useOpenJobs();
  const applied = useAppliedJobs();
  const profile = useMyProfile();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<string>(ALL);

  const jobs = query.data;
  const mySkills = useMemo(() => new Set(profile.data?.skillIds ?? []), [profile.data]);

  // Chip theo canvas: Tất cả · phòng ban · Từ xa · nơi làm việc — dựng từ chính dữ liệu đã tải.
  const chips = useMemo<ChipOption<string>[]>(() => {
    const depts = new Set<string>();
    const places = new Set<string>();
    let remote = false;
    for (const j of jobs ?? []) {
      if (j.departmentName) depts.add(j.departmentName);
      if (j.workLocationName) places.add(j.workLocationName);
      if (j.workArrangement === "REMOTE") remote = true;
    }
    return [
      { key: ALL, label: S.all },
      ...[...depts].sort().map((d) => ({ key: `dept:${d}`, label: d })),
      ...(remote ? [{ key: REMOTE, label: STRINGS.arrangement.REMOTE }] : []),
      ...[...places].sort().map((p) => ({ key: `place:${p}`, label: p })),
    ];
  }, [jobs]);

  const activeFilter = chips.some((c) => c.key === filter) ? filter : ALL;

  const sections = useMemo(() => {
    const k = normalizeForSearch(keyword);
    const list: Scored[] = (jobs ?? [])
      .filter((j) => {
        if (activeFilter === REMOTE && j.workArrangement !== "REMOTE") return false;
        if (activeFilter.startsWith("dept:") && `dept:${j.departmentName}` !== activeFilter) return false;
        if (activeFilter.startsWith("place:") && `place:${j.workLocationName}` !== activeFilter) return false;
        if (!k) return true;
        return normalizeForSearch(
          [j.title, j.departmentName, j.workLocationName, j.employmentTypeName].filter(Boolean).join(" ")
        ).includes(k);
      })
      .map((job) => {
        const ids = job.skillIds ?? [];
        return { job, total: ids.length, matched: ids.filter((id) => mySkills.has(id)).length };
      });

    const fit = list.filter((s) => s.matched > 0).sort((a, b) => b.matched - a.matched);
    const rest = list.filter((s) => s.matched === 0);
    if (!fit.length) return list.length ? [{ title: "", data: list }] : [];
    return [
      { title: S.forYou, data: fit },
      ...(rest.length ? [{ title: S.others, data: rest }] : []),
    ];
  }, [jobs, keyword, activeFilter, mySkills]);

  const filtered = !!keyword.trim() || activeFilter !== ALL;
  const clear = () => {
    setKeyword("");
    setFilter(ALL);
  };

  const header = (
    <View style={styles.header}>
      <SearchField value={keyword} onChangeText={setKeyword} placeholder={S.searchPlaceholder} />
      {chips.length > 1 ? <FilterChips options={chips} value={activeFilter} onChange={setFilter} /> : null}
    </View>
  );

  return (
    <>
      <ScreenHeader title={S.title} />
      {query.isPending ? (
        <View style={styles.pad}>
          {header}
          <SkeletonList />
        </View>
      ) : query.isError && !jobs?.length ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(query.error, "")} onRetry={() => void query.refetch()} />
        </View>
      ) : (
        // SectionList thay QueryList vì cần 2 nhóm; vẫn đủ 4 trạng thái + kéo để làm mới.
        <SectionList
          sections={sections}
          keyExtractor={(s, i) => String(s.job.id ?? i)}
          renderItem={({ item }) => (
            <JobCard {...item} applied={item.job.id != null && applied.has(item.job.id)} />
          )}
          renderSectionHeader={({ section }) =>
            section.title ? <Text style={styles.section}>{section.title}</Text> : null
          }
          ListHeaderComponent={header}
          ListEmptyComponent={
            filtered ? (
              <EmptyState
                title={S.noMatchTitle}
                message={S.noMatchMessage}
                action={{ label: S.clearFilters, onPress: clear }}
              />
            ) : (
              <EmptyState title={S.emptyTitle} message={S.emptyMessage} />
            )
          }
          ItemSeparatorComponent={Gap}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          contentContainerStyle={styles.list}
          style={styles.root}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => {
                void query.refetch();
                void profile.refetch();
              }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

function JobCard({ job, matched, total, applied }: Scored & { applied: boolean }) {
  const place = [job.workLocationName, job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      onPress={() => job.id != null && router.push({ pathname: "/jobs/[id]", params: { id: String(job.id) } })}
      accessibilityLabel={job.title}
      style={styles.card}
    >
      <View style={styles.headRow}>
        <BrandMark size={SIZES.iconTile} />
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>
          {job.departmentName ? <Text style={styles.sub}>{job.departmentName}</Text> : null}
        </View>
        {applied ? <StatusChip label={S.applied} tone="success" /> : null}
      </View>

      <View style={styles.tags}>
        {place ? <Tag label={place} /> : null}
        <Tag label={S.salaryShort(formatSalary(job.salaryMin, job.salaryMax))} />
      </View>

      {matched > 0 ? (
        <View style={styles.match}>
          <Icon name="sparkle" size={SIZES.iconXs} color={COLORS.ai} />
          <Text style={styles.matchText}>{S.skillMatch(matched, total)}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { paddingHorizontal: SPACING.page, gap: SPACING.sm2 },
  list: { paddingHorizontal: SPACING.page, paddingBottom: SPACING.lg, flexGrow: 1 },
  header: { gap: SPACING.sm2, paddingTop: SPACING.xs, paddingBottom: SPACING.sm2 },
  section: {
    paddingHorizontal: SPACING.sm2,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  gap: { height: SPACING.sm2 },
  card: { padding: SPACING.sm2 + SPACING.xxs, gap: SPACING.sm + SPACING.xxs },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm + SPACING.xxs },
  headText: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },
  match: { flexDirection: "row", alignItems: "center", gap: SPACING.xs + SPACING.xxs },
  matchText: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
});
