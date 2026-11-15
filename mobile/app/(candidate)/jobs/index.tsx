import { useMemo, useState } from "react";
import { Pressable, SectionList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenJobs, usePublicCompanyName } from "@/features/jobs/hooks";
import { useAppliedJobs } from "@/features/applications/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { apiErrorMessage } from "@/api/client";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips, SearchField, type ChipOption } from "@/components/ui/search-and-filters";
import { Card } from "@/components/ui/surfaces";
import { ToneTag } from "@/components/ui/status-chip";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { formatRelative, formatSalary, normalizeForSearch } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobs;
const ALL = "all";

type Scored = { job: JobPostingResponse; matched: number };
type GroupKey = keyof typeof S.filterGroups;
type Filters = Record<GroupKey, string[]>;
const NO_FILTERS: Filters = { location: [], arrangement: [], type: [], experience: [] };

/** Giá trị của một tin theo từng nhóm lọc UC17 (rỗng → tin không thuộc nhóm đó). */
const valueOf: Record<GroupKey, (j: JobPostingResponse) => string | undefined> = {
  location: (j) => j.workLocationName,
  arrangement: (j) => (j.workArrangement ? STRINGS.arrangement[j.workArrangement] : undefined),
  type: (j) => j.employmentTypeName,
  // Kinh nghiệm là chữ tự do — chỉ lấy câu ngắn làm lựa chọn, câu dài không thành chip.
  experience: (j) => {
    const e = j.experienceRequired?.trim();
    return e && e.length <= 24 ? e : undefined;
  },
};

/**
 * UC01 · Việc làm (Mobile.html): "N vị trí đang tuyển tại {công ty}", ô tìm + nút Bộ lọc (UC17), chip phòng ban
 * có số lượng, thẻ việc làm (phòng ban · Tuyển gấp · ✓ Đã ứng tuyển, tên, địa điểm · hình thức, lương, thời gian).
 * Endpoint công khai trả CẢ mảng, không có keyword/phân trang → tìm, lọc, xếp ở client.
 * Khác HTML: không có nút chuông (đã có tab Thông báo) và không có nút ♡ lưu tin (backend chưa có).
 * "Phù hợp với bạn": tin khớp kỹ năng trong hồ sơ lên nhóm đầu.
 */
export default function JobsScreen() {
  const query = useOpenJobs();
  const applied = useAppliedJobs();
  const profile = useMyProfile();
  const company = usePublicCompanyName();
  const now = useNow();
  const [keyword, setKeyword] = useState("");
  const [dept, setDept] = useState<string>(ALL);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const jobs = useMemo(() => query.data ?? [], [query.data]);
  const mySkills = useMemo(() => new Set(profile.data?.skillIds ?? []), [profile.data]);

  // Chip phòng ban kèm số tin (UC01 "Tất cả 9 · Kỹ thuật 6").
  const chips = useMemo<ChipOption<string>[]>(() => {
    const count = new Map<string, number>();
    for (const j of jobs) if (j.departmentName) count.set(j.departmentName, (count.get(j.departmentName) ?? 0) + 1);
    return [
      { key: ALL, label: S.all, count: jobs.length },
      ...[...count.keys()].sort().map((d) => ({ key: `dept:${d}`, label: d, count: count.get(d) })),
    ];
  }, [jobs]);
  const activeDept = chips.some((c) => c.key === dept) ? dept : ALL;

  const matches = (j: JobPostingResponse, f: Filters) => {
    if (activeDept !== ALL && `dept:${j.departmentName}` !== activeDept) return false;
    for (const g of Object.keys(f) as GroupKey[]) {
      if (f[g].length && !f[g].includes(valueOf[g](j) ?? "")) return false;
    }
    const k = normalizeForSearch(keyword);
    if (!k) return true;
    return normalizeForSearch(
      [j.title, j.departmentName, j.workLocationName, j.employmentTypeName, j.experienceRequired].filter(Boolean).join(" ")
    ).includes(k);
  };

  const sections = useMemo(() => {
    const list: Scored[] = jobs
      .filter((j) => matches(j, filters))
      .map((job) => ({ job, matched: (job.skillIds ?? []).filter((id) => mySkills.has(id)).length }));
    const fit = list.filter((s) => s.matched > 0).sort((a, b) => b.matched - a.matched);
    const rest = list.filter((s) => s.matched === 0);
    if (!fit.length) return list.length ? [{ title: "", data: list }] : [];
    return [{ title: S.forYou, data: fit }, ...(rest.length ? [{ title: S.others, data: rest }] : [])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, keyword, activeDept, filters, mySkills]);

  const sheetCount = Object.values(filters).reduce((n, v) => n + v.length, 0);
  const filtered = !!keyword.trim() || activeDept !== ALL || sheetCount > 0;
  const clear = () => {
    setKeyword("");
    setDept(ALL);
    setFilters(NO_FILTERS);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchField value={keyword} onChangeText={setKeyword} placeholder={S.searchPlaceholder} />
        </View>
        <IconButton icon="filter" label={S.filter} badge={sheetCount} onPress={() => setSheetOpen(true)} />
      </View>
      {chips.length > 1 ? <FilterChips options={chips} value={activeDept} onChange={setDept} /> : null}
    </View>
  );

  return (
    <>
      <ScreenHeader title={S.title} subtitle={query.data ? S.openAt(jobs.length, company.data ?? "") : undefined} />
      {query.isPending ? (
        <View style={styles.pad}>
          {header}
          <SkeletonList />
        </View>
      ) : query.isError && !jobs.length ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(query.error, "")} onRetry={() => void query.refetch()} />
        </View>
      ) : (
        // SectionList thay QueryList vì cần 2 nhóm; vẫn đủ 4 trạng thái + kéo để làm mới.
        <SectionList
          sections={sections}
          keyExtractor={(s, i) => String(s.job.id ?? i)}
          renderItem={({ item }) => (
            <JobCard job={item.job} now={now} applied={item.job.id != null && applied.has(item.job.id)} />
          )}
          renderSectionHeader={({ section }) => (section.title ? <Text style={styles.section}>{section.title}</Text> : null)}
          ListHeaderComponent={header}
          ListEmptyComponent={
            filtered ? (
              <EmptyState title={S.noMatchTitle} message={S.noMatchMessage} action={{ label: S.clearFilters, onPress: clear }} />
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

      {sheetOpen ? (
        <FilterSheet
          jobs={jobs}
          initial={filters}
          countFor={(f) => jobs.filter((j) => matches(j, f)).length}
          onClose={() => setSheetOpen(false)}
          onApply={(f) => {
            setFilters(f);
            setSheetOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

/** Thẻ việc làm UC01. */
function JobCard({ job, applied, now }: { job: JobPostingResponse; applied: boolean; now: number }) {
  const place = [job.workLocationName, job.workArrangement ? STRINGS.arrangement[job.workArrangement] : null]
    .filter(Boolean)
    .join(" · ");
  const hasTags = !!job.departmentName || !!job.urgent || applied;
  return (
    <Card
      onPress={() => job.id != null && router.push({ pathname: "/jobs/[id]", params: { id: String(job.id) } })}
      accessibilityLabel={job.title}
      style={styles.card}
    >
      {hasTags ? (
        <View style={styles.tags}>
          {job.departmentName ? <ToneTag label={job.departmentName} tone="brand" /> : null}
          {job.urgent ? <ToneTag label={S.urgent} tone="danger" /> : null}
          {applied ? <ToneTag label={S.appliedTag} tone="success" icon="check" /> : null}
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      {place ? (
        <View style={styles.meta}>
          <Icon name="pin" size={SIZES.iconXs} color={COLORS.textSecondary} />
          <Text style={styles.sub} numberOfLines={1}>
            {place}
          </Text>
        </View>
      ) : null}
      <View style={styles.bottom}>
        <Text style={styles.salary}>{formatSalary(job.salaryMin, job.salaryMax)}</Text>
        {job.publishedAt ? <Text style={styles.time}>{formatRelative(job.publishedAt, new Date(now))}</Text> : null}
      </View>
    </Card>
  );
}

/** UC17 · Bộ lọc: các nhóm chọn nhiều dựng từ chính danh sách tin; "Xem N việc làm" đếm trước khi áp dụng. */
function FilterSheet({
  jobs,
  initial,
  countFor,
  onClose,
  onApply,
}: {
  jobs: JobPostingResponse[];
  initial: Filters;
  countFor: (f: Filters) => number;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(initial);
  const groups = (Object.keys(S.filterGroups) as GroupKey[])
    .map((g) => ({ g, options: [...new Set(jobs.map(valueOf[g]).filter(Boolean) as string[])].sort() }))
    .filter((x) => x.options.length > 1 || draft[x.g].length > 0);
  const toggle = (g: GroupKey, v: string) =>
    setDraft((d) => ({ ...d, [g]: d[g].includes(v) ? d[g].filter((x) => x !== v) : [...d[g], v] }));

  return (
    <BottomSheet
      visible
      onDismiss={onClose}
      title={S.filter}
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <PillButton label={S.filterReset} variant="tonal" fullWidth onPress={() => setDraft(NO_FILTERS)} />
          </View>
          <View style={styles.flex}>
            <PillButton label={S.filterShow(countFor(draft))} fullWidth onPress={() => onApply(draft)} />
          </View>
        </View>
      }
    >
      {groups.map(({ g, options }) => (
        <View key={g} style={styles.group}>
          <Text style={styles.groupTitle}>{S.filterGroups[g]}</Text>
          <View style={styles.choices}>
            {options.map((v) => {
              const on = draft[g].includes(v);
              return (
                <Pressable
                  key={v}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(g, v)}
                  style={[styles.choice, on && styles.choiceOn]}
                >
                  <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{v}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1 },
  pad: { paddingHorizontal: SPACING.page, gap: SPACING.sm2 },
  list: { paddingHorizontal: SPACING.page, paddingBottom: SPACING.lg, flexGrow: 1 },
  header: { gap: SPACING.sm2, paddingTop: SPACING.xs, paddingBottom: SPACING.sm2 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  section: {
    paddingHorizontal: SPACING.sm2,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  gap: { height: SPACING.sm2 },
  card: { padding: SPACING.md, gap: SPACING.sm },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  meta: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  sub: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  salary: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.primary },
  time: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  footer: { flexDirection: "row", gap: SPACING.sm2 },
  group: { gap: SPACING.sm },
  groupTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  // UC17: lựa chọn đang bật nền chữ chính (xanh than), chữ trắng; còn lại nền xám nhạt.
  choice: { height: SIZES.control, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, justifyContent: "center", backgroundColor: COLORS.fill },
  choiceOn: { backgroundColor: COLORS.textPrimary },
  choiceText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  choiceTextOn: { color: COLORS.textOnPrimary },
});
