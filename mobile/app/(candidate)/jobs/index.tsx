import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useOpenJobs } from "@/features/jobs/hooks";
import { JobCard } from "@/features/jobs/job-card";
import { useAppliedJobs } from "@/features/applications/hooks";
import { apiErrorMessage } from "@/api/client";
import { CandidateAppBar } from "@/components/app-bar";
import { PageTitle } from "@/components/ui/screen-chrome";
import { FilterChips, SearchField, type ChipOption } from "@/components/ui/search-and-filters";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { normalizeForSearch } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { JobPostingResponse } from "@/types/api";

const S = STRINGS.jobs;
const ALL = "all";
/** Redesign-Final: mỗi lần hiện 8 vị trí, nút "Hiển thị thêm" mở tiếp 8. */
const PAGE = 8;

type GroupKey = keyof typeof S.filterGroups;
type Filters = Record<GroupKey, string[]>;
const NO_FILTERS: Filters = { location: [], arrangement: [], type: [], experience: [] };

/** Giá trị của một tin theo từng nhóm lọc (rỗng → tin không thuộc nhóm đó). */
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
 * Việc làm — Redesign-Final `views.jobs`: tiêu đề, ô tìm + nút bộ lọc, chip phòng ban, "Tất cả vị trí · N vị trí",
 * thẻ việc làm, "Hiển thị thêm". Endpoint công khai trả CẢ mảng, không có keyword/phân trang → tìm, lọc ở client.
 * Trang chủ mở tab này kèm `q` (từ khóa), `dept` (phòng ban) hoặc `filter=1` (mở bộ lọc); `t` đổi mỗi lần bấm.
 */
export default function JobsScreen() {
  const params = useLocalSearchParams<{ q?: string; dept?: string; filter?: string; t?: string }>();
  const query = useOpenJobs();
  const applied = useAppliedJobs();
  const [keyword, setKeyword] = useState(params.q ?? "");
  const [dept, setDept] = useState<string>(params.dept ? `dept:${params.dept}` : ALL);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(params.filter === "1");
  const [limit, setLimit] = useState(PAGE);

  // Trang chủ gửi tham số mới (tab đã mở sẵn nên không dựng lại màn) → áp dụng ngay trong lúc render.
  const [seenT, setSeenT] = useState(params.t);
  if (params.t !== seenT) {
    setSeenT(params.t);
    setKeyword(params.q ?? "");
    setDept(params.dept ? `dept:${params.dept}` : ALL);
    if (params.filter === "1") setSheetOpen(true);
    setLimit(PAGE);
  }

  const jobs = useMemo(() => query.data ?? [], [query.data]);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => jobs.filter((j) => matches(j, filters)), [jobs, keyword, activeDept, filters]);
  const shown = list.slice(0, limit);

  const sheetCount = Object.values(filters).reduce((n, v) => n + v.length, 0);
  const filtered = !!keyword.trim() || activeDept !== ALL || sheetCount > 0;
  const clear = () => {
    setKeyword("");
    setDept(ALL);
    setFilters(NO_FILTERS);
  };

  const header = (
    <View style={styles.header}>
      <PageTitle eyebrow={S.eyebrow} title={S.title} subtitle={S.subtitle} />
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchField
            value={keyword}
            onChangeText={(v) => {
              setKeyword(v);
              setLimit(PAGE);
            }}
            placeholder={S.searchPlaceholder}
          />
        </View>
        <IconButton icon="filter" label={S.filter} badge={sheetCount} onPress={() => setSheetOpen(true)} />
      </View>
      {chips.length > 1 ? (
        <FilterChips
          options={chips}
          value={activeDept}
          onChange={(k) => {
            setDept(k);
            setLimit(PAGE);
          }}
        />
      ) : null}
      {query.data ? (
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>{filtered ? S.results : S.allJobs}</Text>
          <Text style={styles.countValue}>{S.count(list.length)}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <CandidateAppBar />
      {query.isPending ? (
        <View style={styles.pad}>
          {header}
          <SkeletonList />
        </View>
      ) : query.isError && !jobs.length ? (
        <View style={styles.pad}>
          {header}
          <ErrorState message={apiErrorMessage(query.error, "")} onRetry={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(j, i) => String(j.id ?? i)}
          renderItem={({ item }) => <JobCard job={item} applied={item.id != null && applied.has(item.id)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            filtered ? (
              <EmptyState
                icon="search"
                title={S.noMatchTitle}
                message={S.noMatchMessage}
                action={{ label: S.clearFilters, onPress: clear }}
              />
            ) : (
              <EmptyState icon="briefcase" title={S.emptyTitle} message={S.emptyMessage} />
            )
          }
          ListFooterComponent={
            shown.length < list.length ? (
              <PillButton
                label={S.showMore(Math.min(PAGE, list.length - shown.length))}
                variant="outline"
                fullWidth
                onPress={() => setLimit((l) => l + PAGE)}
                style={styles.more}
              />
            ) : null
          }
          ItemSeparatorComponent={Gap}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          contentContainerStyle={styles.list}
          style={styles.root}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
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
            setLimit(PAGE);
            setSheetOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

/** Bộ lọc: các nhóm chọn nhiều dựng từ chính danh sách tin; "Xem N việc làm" đếm trước khi áp dụng. */
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
      title={S.filterTitle}
      subtitle={S.filterSubtitle}
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <PillButton label={S.filterReset} variant="outline" fullWidth onPress={() => setDraft(NO_FILTERS)} />
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
  pad: { padding: SPACING.page, gap: SPACING.sm2 },
  list: { padding: SPACING.page, paddingBottom: SPACING.xl, flexGrow: 1 },
  header: { gap: SPACING.sm2, paddingBottom: SPACING.sm2 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.xs },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.xs },
  countLabel: { fontFamily: FONT.bold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  countValue: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  gap: { height: SPACING.sm2 },
  more: { marginTop: SPACING.sm2 },
  footer: { flexDirection: "row", gap: SPACING.sm2 },
  group: { gap: SPACING.sm },
  groupTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  // Lựa chọn trong bộ lọc: chip viền mảnh; đang bật → nền nhạt màu thương hiệu, chữ đậm (như chip lọc).
  choice: {
    height: SIZES.control,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.control,
    justifyContent: "center",
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  choiceOn: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  choiceText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  choiceTextOn: { fontFamily: FONT.semibold, color: COLORS.primaryDark },
});
