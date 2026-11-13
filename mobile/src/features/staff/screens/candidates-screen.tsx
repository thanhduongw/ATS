import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import {
  FilterChips,
  SearchField,
  SearchLauncher,
  type ChipOption,
} from "@/components/ui/search-and-filters";
import { useUnreadCount } from "@/features/notifications/hooks";
import { normalizeForSearch } from "@/lib/format";
import { toFixedStage, type FixedStage } from "@/lib/stages";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import type { ApplicationResponse } from "@/types/api";
import { CandidateCard } from "../candidate-card";
import {
  useMyId,
  useStaffApplications,
  useStaffInterviews,
  useStaffOffers,
} from "../hooks";
import { candidateNote } from "../notes";
import { areaOf, needsMyEvaluation, unscheduled } from "../tasks";

const S = STRINGS.staff;
const C = S.candidates;
const F = C.filter;

type HrTab = "ALL" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER";
type HmTab = "MINE" | "ALL" | "HIRED" | "REJECTED";
type Sort = "ai" | "newest" | "oldest";
type Need = "all" | "waitEval" | "notScheduled";
type Tier = "all" | "FIT" | "UNCLASSIFIED" | "NOT_FIT";
type Filters = { job: string; tier: Tier; need: Need; sort: Sort };
const DEFAULT: Filters = { job: "all", tier: "all", need: "all", sort: "ai" };

const ACTIVE: FixedStage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"];

/**
 * UR02 / UH02 · MÀN CHÍNH · Ứng viên. Chuyên viên tuyển dụng: chip giai đoạn kèm số (chỉ hồ sơ đang
 * trong quy trình), "Việc làm · Sắp xếp" mở UR19. Đại diện phòng ban: Phỏng vấn của tôi · Tất cả ·
 * Đã tuyển · Từ chối (chỉ hồ sơ của phòng — backend lọc sẵn).
 */
export function StaffCandidatesScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const now = useNow();
  const params = useLocalSearchParams<{ stage?: string }>();
  const unread = useUnreadCount();

  const query = useStaffApplications();
  const ivs = useStaffInterviews();
  const offers = useStaffOffers({ enabled: isHr });
  const [keyword, setKeyword] = useState("");
  const [hrTab, setHrTab] = useState<HrTab>((params.stage as HrTab) ?? "ALL");
  const [hmTab, setHmTab] = useState<HmTab>("MINE");
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [sheet, setSheet] = useState(false);

  const apps = useMemo(() => query.data ?? [], [query.data]);
  const interviews = useMemo(() => ivs.data ?? [], [ivs.data]);
  const ctx = { interviews, offers: offers.data ?? [], me, now };
  const myAppIds = useMemo(
    () =>
      new Set(
        interviews
          .filter((iv) =>
            (iv.interviewers ?? []).some((p) => p.interviewerId === me),
          )
          .map((iv) => iv.applicationId),
      ),
    [interviews, me],
  );
  const waitEvalIds = new Set(
    interviews
      .filter((iv) => needsMyEvaluation(iv, me, now))
      .map((iv) => iv.applicationId),
  );
  const notScheduledIds = new Set(
    unscheduled({ applications: apps, interviews }).map((a) => a.id),
  );

  const active = apps.filter((a) =>
    ACTIVE.includes(toFixedStage(a.currentStageType)),
  );
  const jobs = [...new Set(apps.map((a) => a.jobTitle ?? "").filter(Boolean))];

  const apply = (list: ApplicationResponse[], f: Filters) => {
    const k = normalizeForSearch(keyword);
    return list
      .filter(
        (a) => !k || normalizeForSearch(a.candidateName ?? "").includes(k),
      )
      .filter((a) => f.job === "all" || a.jobTitle === f.job)
      .filter((a) => f.tier === "all" || a.aiTier === f.tier)
      .filter(
        (a) =>
          f.need === "all" ||
          (f.need === "waitEval"
            ? waitEvalIds.has(a.id)
            : notScheduledIds.has(a.id)),
      )
      .sort((a, b) =>
        f.sort === "ai"
          ? (b.aiScore ?? -1) - (a.aiScore ?? -1)
          : f.sort === "newest"
            ? new Date(b.appliedAt ?? 0).getTime() -
              new Date(a.appliedAt ?? 0).getTime()
            : new Date(a.appliedAt ?? 0).getTime() -
              new Date(b.appliedAt ?? 0).getTime(),
      );
  };

  const base = isHr
    ? hrTab === "ALL"
      ? active
      : active.filter((a) => toFixedStage(a.currentStageType) === hrTab)
    : hmTab === "MINE"
      ? apps.filter((a) => myAppIds.has(a.id))
      : hmTab === "ALL"
        ? active
        : apps.filter((a) => toFixedStage(a.currentStageType) === hmTab);
  const rows = apply(base, filters);

  const countStage = (g: FixedStage) =>
    active.filter((a) => toFixedStage(a.currentStageType) === g).length;
  const hrOptions: ChipOption<HrTab>[] = [
    { key: "ALL", label: C.all, count: active.length },
    ...(["APPLIED", "SCREENING", "INTERVIEW", "OFFER"] as const).map((g) => ({
      key: g,
      label: S.stage[g],
      count: countStage(g),
    })),
  ];
  const hmOptions: ChipOption<HmTab>[] = [
    {
      key: "MINE",
      label: C.mineTab,
      count: apps.filter((a) => myAppIds.has(a.id)).length,
    },
    { key: "ALL", label: C.all, count: active.length },
    {
      key: "HIRED",
      label: C.hiredTab,
      count: apps.filter((a) => toFixedStage(a.currentStageType) === "HIRED")
        .length,
    },
    {
      key: "REJECTED",
      label: C.rejectedTab,
      count: apps.filter((a) => toFixedStage(a.currentStageType) === "REJECTED")
        .length,
    },
  ];

  const listQuery = {
    ...query,
    refetch: () =>
      Promise.all([query.refetch(), ivs.refetch(), offers.refetch()]),
  };
  const deptName = isHr
    ? ""
    : (apps.find((a) => a.departmentName)?.departmentName ?? "");

  return (
    <>
      <ScreenHeader
        title={C.title}
        subtitle={
          deptName
            ? `${deptName} · ${C.subtitle(active.length)}`
            : C.subtitle(active.length)
        }
        actions={
          <IconButton
            icon="bell"
            label={S.bell}
            badge={unread}
            onPress={() => router.push(`/${area}/notifications`)}
          />
        }
      />
      <QueryList
        query={listQuery}
        data={rows}
        keyExtractor={(a, i) => String(a.id ?? i)}
        renderItem={({ item }) => (
          <CandidateCard
            app={item}
            area={area}
            note={candidateNote(item, ctx)}
          />
        )}
        empty={{ title: C.emptyTitle, message: C.emptyMessage }}
        header={
          <View style={styles.header}>
            {isHr ? (
              <SearchLauncher placeholder={STRINGS.staff.search.placeholder} onPress={() => router.push("/hr/search")} />
            ) : (
              <SearchField value={keyword} onChangeText={setKeyword} placeholder={C.search} />
            )}
            {isHr ? (
              <FilterChips
                options={hrOptions}
                value={hrTab}
                onChange={setHrTab}
              />
            ) : (
              <FilterChips
                options={hmOptions}
                value={hmTab}
                onChange={setHmTab}
              />
            )}
            {isHr ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraft(filters);
                  setSheet(true);
                }}
                style={styles.filterRow}
              >
                <Text style={styles.filterText} numberOfLines={1}>
                  {C.job(filters.job === "all" ? C.allJobs : filters.job)}
                </Text>
                <Text style={styles.filterText}>
                  {C.sort(F.sorts[filters.sort])}
                </Text>
                <Icon
                  name="filter"
                  size={SIZES.iconSm}
                  color={COLORS.primaryDark}
                />
              </Pressable>
            ) : null}
          </View>
        }
      />

      <BottomSheet
        visible={sheet}
        onDismiss={() => setSheet(false)}
        title={F.title}
        footer={
          <View style={styles.footer}>
            <PillButton
              label={F.cancel}
              variant="tonal"
              onPress={() => setSheet(false)}
              style={styles.flex}
            />
            <PillButton
              label={F.apply(apply(base, draft).length)}
              onPress={() => {
                setFilters(draft);
                setSheet(false);
              }}
              style={styles.flex}
            />
          </View>
        }
      >
        <View style={styles.resetRow}>
          <PillButton
            label={F.reset}
            variant="text"
            size="sm"
            onPress={() => setDraft(DEFAULT)}
          />
        </View>
        <Text style={styles.group}>{F.job}</Text>
        <FilterChips
          options={[
            { key: "all", label: C.allJobs },
            ...jobs.map((j) => ({ key: j, label: j })),
          ]}
          value={draft.job}
          onChange={(job) => setDraft({ ...draft, job })}
        />
        <Text style={styles.group}>{F.ai}</Text>
        <FilterChips<Tier>
          options={[
            { key: "all", label: C.all },
            ...(["FIT", "UNCLASSIFIED", "NOT_FIT"] as const).map((t) => ({
              key: t,
              label: F.aiTiers[t],
            })),
          ]}
          value={draft.tier}
          onChange={(tier) => setDraft({ ...draft, tier })}
        />
        <Text style={styles.group}>{F.need}</Text>
        <FilterChips<Need>
          options={[
            { key: "all", label: C.all },
            { key: "waitEval", label: F.needs.waitEval },
            { key: "notScheduled", label: F.needs.notScheduled },
          ]}
          value={draft.need}
          onChange={(need) => setDraft({ ...draft, need })}
        />
        <Text style={styles.group}>{F.sort}</Text>
        <FilterChips<Sort>
          options={(["ai", "newest", "oldest"] as const).map((k) => ({
            key: k,
            label: F.sorts[k],
          }))}
          value={draft.sort}
          onChange={(sort) => setDraft({ ...draft, sort })}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: SPACING.sm2 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: SIZES.control,
  },
  filterText: {
    flexShrink: 1,
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryDark,
  },
  footer: { flexDirection: "row", gap: SPACING.sm2 },
  flex: { flex: 1 },
  resetRow: { alignItems: "flex-end" },
  group: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
});
