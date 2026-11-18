import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMyOffers } from "@/features/offers/hooks";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { Icon } from "@/components/ui/icon";
import { STRINGS } from "@/lib/strings";
import { offerStatus } from "@/lib/status";
import { formatDate, formatMoney } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import type { CandidateOffer } from "@/types/api";

const S = STRINGS.offers;

/** Thư mời nhận việc — Redesign-Final `views.offers`. Mở từ mục Cá nhân; thư mời của từng đơn còn nằm trong chi tiết đơn. */
export default function OffersScreen() {
  const query = useMyOffers();
  const offers = [...(query.data ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );

  return (
    <>
      <ScreenHeader eyebrow={S.eyebrow} title={S.title} subtitle={S.subtitle} back />
      <QueryList
        query={query}
        data={offers}
        keyExtractor={(o, i) => String(o.id ?? i)}
        renderItem={({ item }) => <OfferCard offer={item} />}
        empty={{
          title: S.emptyTitle,
          message: S.emptyMessage,
          action: { label: STRINGS.tabs.candidate.applications, onPress: () => router.navigate("/applications") },
        }}
      />
    </>
  );
}

function OfferCard({ offer }: { offer: CandidateOffer }) {
  const meta = [offer.contractTypeName, offer.startDate ? S.startOn(formatDate(offer.startDate)) : S.startTbd]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card
      accessibilityLabel={offer.jobTitle}
      onPress={() => offer.id != null && router.push({ pathname: "/offers/[id]", params: { id: String(offer.id) } })}
    >
      <View style={styles.row}>
        <StatusChip {...offerStatus(offer.status, "CANDIDATE")} />
        <Text style={styles.small}>{formatDate(offer.createdAt)}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.title} numberOfLines={2}>
          {offer.jobTitle}
        </Text>
        <Text style={styles.sub}>{meta}</Text>
      </View>
      <Text style={styles.salary}>{offer.salaryOffered != null ? formatMoney(offer.salaryOffered) : S.negotiable}</Text>
      <View style={styles.row}>
        <Text style={[styles.sub, styles.flex]}>
          {offer.responseDeadline ? S.respondBy(formatDate(offer.responseDeadline)) : S.viewTerms}
        </Text>
        <View style={styles.link}>
          <Text style={styles.linkText}>{S.detail}</Text>
          <Icon name="arrowRight" size={SIZES.iconXs} color={COLORS.primaryDark} strokeWidth={1.8} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  flex: { flex: 1 },
  block: { gap: SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  small: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  salary: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.primary },
  link: { flexDirection: "row", alignItems: "center", gap: SPACING.xxs },
  linkText: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
});
