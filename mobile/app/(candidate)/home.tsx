import { useMemo, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useOpenJobs } from "@/features/jobs/hooks";
import { JobCard } from "@/features/jobs/job-card";
import { useAppliedJobs } from "@/features/applications/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { useCareersConfig } from "@/features/company/hooks";
import { heroColors, type CareersConfig } from "@/features/company/careers-config";
import { apiErrorMessage } from "@/api/client";
import { CandidateAppBar } from "@/components/app-bar";
import { PageTitle } from "@/components/ui/screen-chrome";
import { Eyebrow } from "@/components/ui/surfaces";
import { FilterChips, SearchField } from "@/components/ui/search-and-filters";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, LETTER_SPACING, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";

const S = STRINGS.home;
const NONE = "";

/**
 * Trang chủ ứng viên — Redesign-Final `views.home`, nội dung lấy từ trang tuyển dụng Quản trị soạn trên web (C01):
 * lời chào · khối đầu trang (ảnh bìa, dòng nhỏ, khẩu hiệu, mô tả, nền theo cấu hình) · ô tìm việc · phòng ban ·
 * vị trí nổi bật (tiêu đề và số lượng theo cấu hình, tuyển gấp lên đầu như web).
 * Không có: ô số liệu, thẻ phỏng vấn sắp tới, việc làm đã lưu (chốt với người dùng 19/11/2026).
 */
export default function HomeScreen() {
  const jobs = useOpenJobs();
  const applied = useAppliedJobs();
  const profile = useMyProfile();
  const careers = useCareersConfig();
  const [keyword, setKeyword] = useState("");

  const list = useMemo(() => jobs.data ?? [], [jobs.data]);
  const departments = useMemo(
    () => [...new Set(list.map((j) => j.departmentName).filter(Boolean) as string[])].sort(),
    [list]
  );
  const featured = useMemo(
    () =>
      [...list]
        .sort(
          (a, b) =>
            Number(!!b.urgent) - Number(!!a.urgent) ||
            new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
        )
        .slice(0, careers.config.featured.count),
    [list, careers.config.featured.count]
  );

  const firstName = (profile.data?.fullName ?? "").trim().split(/\s+/).pop() ?? "";
  const companyName = careers.company?.name?.trim() ?? "";

  // `t` đổi mỗi lần bấm để tab Việc làm (đã mở sẵn, giữ trạng thái) nhận lại cùng một từ khóa.
  const openJobs = (params: Record<string, string> = {}) =>
    router.navigate({ pathname: "/jobs", params: { ...params, t: String(Date.now()) } });

  return (
    <View style={styles.root}>
      <CandidateAppBar />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl
            refreshing={jobs.isRefetching || careers.isRefetching}
            onRefresh={() => {
              void jobs.refetch();
              void careers.refetch();
              void profile.refetch();
            }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* <PageTitle title={S.greeting(firstName)} /> */}

        {careers.config.visible.hero ? (
          <Hero
            hero={careers.config.hero}
            coverUrl={careers.coverUrl}
            jobCount={list.length}
            company={companyName}
            onCta={() => openJobs()}
          />
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.flex}>
            <SearchField
              value={keyword}
              onChangeText={setKeyword}
              placeholder={S.searchPlaceholder}
              onSubmitEditing={() => openJobs({ q: keyword.trim() })}
            />
          </View>
          <IconButton icon="filter" label={STRINGS.jobs.filter} onPress={() => openJobs({ filter: "1" })} />
        </View>

        {departments.length ? (
          <View style={styles.section}>
            <SectionHead kicker={S.deptKicker} title={S.deptTitle} action={{ label: S.all, onPress: () => openJobs() }} />
            <FilterChips
              options={departments.map((d) => ({ key: d, label: d }))}
              value={NONE}
              onChange={(d) => openJobs({ dept: d })}
            />
          </View>
        ) : null}

        {careers.config.visible.featured ? (
          <View style={styles.section}>
            <SectionHead
              kicker={S.featuredKicker}
              title={careers.config.featured.title}
              action={list.length ? { label: S.viewAll(list.length), onPress: () => openJobs() } : undefined}
            />
            {jobs.isPending ? (
              <SkeletonList count={2} />
            ) : jobs.isError && !list.length ? (
              <ErrorState message={apiErrorMessage(jobs.error, "")} onRetry={() => void jobs.refetch()} />
            ) : featured.length ? (
              <View style={styles.cards}>
                {featured.map((j) => (
                  <JobCard key={j.id} job={j} applied={j.id != null && applied.has(j.id)} />
                ))}
              </View>
            ) : (
              <EmptyState icon="briefcase" title={S.emptyTitle} message={S.emptyMessage} />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionHead({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.flex}>
        <Eyebrow>{kicker}</Eyebrow>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {action ? <PillButton label={action.label} variant="text" size="sm" onPress={action.onPress} /> : null}
    </View>
  );
}

/**
 * Khối đầu trang theo cấu hình "Ảnh bìa & khẩu hiệu" của web: ảnh bìa (nếu có) ở trên, phần chữ trắng trên nền
 * màu thương hiệu / một màu / dải hai màu. Dải màu vẽ bằng react-native-svg (không thêm expo-linear-gradient).
 */
function Hero({
  hero,
  coverUrl,
  jobCount,
  company,
  onCta,
}: {
  hero: CareersConfig["hero"];
  coverUrl: string | null;
  jobCount: number;
  company: string;
  onCta: () => void;
}) {
  const colors = heroColors(hero);
  const eyebrow = hero.eyebrow.replace("{jobs}", String(jobCount)).trim();
  return (
    <View style={styles.hero}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : null}
      <View style={[styles.heroBody, { backgroundColor: colors[0] }]}>
        {colors.length > 1 ? (
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="0.4" y2="1">
                {colors.map((c, i) => (
                  <Stop key={i} offset={i / (colors.length - 1)} stopColor={c} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={100} height={100} fill="url(#hero)" />
          </Svg>
        ) : null}
        {eyebrow ? (
          <View style={styles.heroPill}>
            <Icon name="send" size={SIZES.iconXs} color={COLORS.textOnPrimary} />
            <Text style={styles.heroPillText} numberOfLines={1}>
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle}>{hero.tagline.trim() || S.taglineFallback(company)}</Text>
        {hero.description.trim() ? (
          <Text style={styles.heroText} numberOfLines={4}>
            {hero.description.trim()}
          </Text>
        ) : null}
        <PillButton
          label={S.viewJobs}
          iconRight="arrowRight"
          variant="outline"
          size="sm"
          onPress={onCta}
          style={styles.heroCta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1, gap: SPACING.xxs },
  content: { padding: SPACING.page, paddingBottom: SPACING.xl, gap: SPACING.md2 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  section: { gap: SPACING.sm2 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.section,
    letterSpacing: LETTER_SPACING.title,
    color: COLORS.textPrimary,
  },
  cards: { gap: SPACING.sm2 },

  hero: { borderRadius: RADIUS.hero, overflow: "hidden", backgroundColor: COLORS.navy },
  // Một-lần: tỉ lệ ảnh bìa trên điện thoại (ảnh ngang, cao bằng ~45% bề ngang).
  cover: { width: "100%", aspectRatio: 2.2, backgroundColor: COLORS.navy2 },
  heroBody: { padding: SPACING.md2, gap: SPACING.sm2 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: SPACING.xs + SPACING.xxs,
    height: SIZES.tag + SPACING.xs,
    paddingHorizontal: SPACING.sm2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.onDarkFill,
  },
  heroPillText: { flexShrink: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textOnPrimary },
  heroTitle: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    lineHeight: FONT_SIZE.h2 * LINE_HEIGHT.title,
    letterSpacing: LETTER_SPACING.title,
    color: COLORS.textOnPrimary,
  },
  heroText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textOnDarkMuted,
  },
  heroCta: { marginTop: SPACING.xs, borderWidth: 0 },
});
