import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenJobs } from "@/features/jobs/hooks";
import { useAppliedJobs } from "@/features/applications/hooks";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips, SearchField, type ChipOption } from "@/components/ui/search-and-filters";
import { Card, IconTile } from "@/components/ui/surfaces";
import { StatusChip, Tag } from "@/components/ui/status-chip";
import { STRINGS } from "@/lib/strings";
import { formatRelative, formatSalary, normalizeForSearch } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobs;
const ALL = "all";
const REMOTE = "remote";

/**
 * M06 — Việc làm (B1). Endpoint công khai trả CẢ mảng, không có keyword/phân trang, nên tìm
 * kiếm và chip lọc đều chạy ở client.
 *
 * Chip lọc theo canvas: "Tất cả" + các phòng ban đang có tin + "Từ xa". Dựng từ chính dữ liệu
 * đã tải, nên không có chip nào bấm vào mà ra rỗng.
 */
export default function JobsScreen() {
  const query = useOpenJobs();
  const applied = useAppliedJobs();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<string>(ALL);

  const jobs = query.data;

  const chips = useMemo<ChipOption<string>[]>(() => {
    const departments = new Map<string, number>();
    let remote = 0;
    for (const j of jobs ?? []) {
      if (j.departmentName) departments.set(j.departmentName, (departments.get(j.departmentName) ?? 0) + 1);
      if (j.workArrangement === "REMOTE") remote++;
    }
    return [
      { key: ALL, label: S.all },
      ...[...departments.keys()].sort().map((d) => ({ key: `dept:${d}`, label: d })),
      ...(remote > 0 ? [{ key: REMOTE, label: STRINGS.arrangement.REMOTE }] : []),
    ];
  }, [jobs]);

  // Bộ lọc đang chọn biến mất sau khi tải lại (phòng ban hết tin) → quay về "Tất cả".
  const activeFilter = chips.some((c) => c.key === filter) ? filter : ALL;

  const visible = useMemo(() => {
    const k = normalizeForSearch(keyword);
    return (jobs ?? []).filter((j) => {
      if (activeFilter === REMOTE && j.workArrangement !== "REMOTE") return false;
      if (activeFilter.startsWith("dept:") && `dept:${j.departmentName}` !== activeFilter) return false;
      if (!k) return true;
      const haystack = normalizeForSearch(
        [j.title, j.departmentName, j.workLocationName, j.employmentTypeName].filter(Boolean).join(" ")
      );
      return haystack.includes(k);
    });
  }, [jobs, keyword, activeFilter]);

  const filtered = !!keyword.trim() || activeFilter !== ALL;

  return (
    <>
      <ScreenHeader title={S.title} />
      <QueryList
        query={query}
        data={visible}
        keyExtractor={(j, i) => String(j.id ?? i)}
        renderItem={({ item }) => <JobCard job={item} applied={item.id != null && applied.has(item.id)} />}
        header={
          <>
            <SearchField value={keyword} onChangeText={setKeyword} placeholder={S.searchPlaceholder} />
            {chips.length > 1 ? <FilterChips options={chips} value={activeFilter} onChange={setFilter} /> : null}
            {jobs && visible.length > 0 ? <Text style={styles.count}>{S.openCount(visible.length)}</Text> : null}
          </>
        }
        empty={
          filtered
            ? {
                title: S.noMatchTitle,
                message: S.noMatchMessage,
                action: {
                  label: S.clearFilters,
                  onPress: () => {
                    setKeyword("");
                    setFilter(ALL);
                  },
                },
              }
            : { title: S.emptyTitle, message: S.emptyMessage }
        }
      />
    </>
  );
}

function JobCard({ job, applied }: { job: JobPostingResponse; applied: boolean }) {
  const arrangement = job.workArrangement ? STRINGS.arrangement[job.workArrangement] : undefined;
  return (
    <Card
      onPress={() => job.id != null && router.push({ pathname: "/jobs/[id]", params: { id: String(job.id) } })}
      accessibilityLabel={job.title}
    >
      <View style={styles.headRow}>
        <IconTile icon="briefcase" />
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>
          {job.departmentName ? <Text style={styles.sub}>{job.departmentName}</Text> : null}
        </View>
      </View>

      {arrangement || job.workLocationName ? (
        <View style={styles.tags}>
          {arrangement ? <Tag label={arrangement} /> : null}
          {job.workLocationName ? <Tag label={job.workLocationName} /> : null}
        </View>
      ) : null}

      <View style={styles.footRow}>
        <Text style={styles.salary}>{formatSalary(job.salaryMin, job.salaryMax)}</Text>
        {applied ? (
          <StatusChip label={S.applied} tone="success" />
        ) : job.publishedAt ? (
          <Text style={styles.sub}>{STRINGS.format.posted(formatRelative(job.publishedAt))}</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  count: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.xs,
  },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm2 },
  headText: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.medium, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },
  footRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  salary: { flexShrink: 1, fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
});
