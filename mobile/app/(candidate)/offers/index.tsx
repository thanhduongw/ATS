import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMyOffers } from "@/features/offers/hooks";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, IconTile } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { offerStatus } from "@/lib/status";
import { formatDate, formatDaysLeft, formatMoney } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import type { CandidateOffer } from "@/types/api";

const S = STRINGS.offers;

/** M11 — Thư mời của tôi (B6). Mở từ Hồ sơ hoặc từ thông báo. */
export default function OffersScreen() {
  const query = useMyOffers();
  const offers = [...(query.data ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );

  return (
    <>
      <ScreenHeader title={S.title} subtitle={S.subtitle} back />
      <QueryList
        query={query}
        data={offers}
        keyExtractor={(o, i) => String(o.id ?? i)}
        renderItem={({ item }) => <OfferCard offer={item} />}
        empty={{ title: S.emptyTitle, message: S.emptyMessage }}
      />
    </>
  );
}

function OfferCard({ offer }: { offer: CandidateOffer }) {
  // Duyệt offer = gửi cho ứng viên → với ứng viên, APPROVED nghĩa là đang chờ họ phản hồi.
  const awaiting = offer.status === "APPROVED";
  const daysLeft = awaiting ? formatDaysLeft(offer.responseDeadline) : null;
  const open = () => offer.id != null && router.push({ pathname: "/offers/[id]", params: { id: String(offer.id) } });

  return (
    <Card>
      <View style={styles.head}>
        <IconTile icon="document" />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {offer.jobTitle}
          </Text>
          {offer.contractTypeName ? <Text style={styles.sub}>{offer.contractTypeName}</Text> : null}
        </View>
        <StatusChip {...offerStatus(offer.status, "CANDIDATE")} />
      </View>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{S.salary}</Text>
          <Text style={styles.money}>{formatMoney(offer.salaryOffered)}</Text>
        </View>
        {offer.responseDeadline ? (
          <View style={[styles.fact, styles.factRight]}>
            <Text style={styles.factLabel}>{S.deadline}</Text>
            <Text style={styles.factValue}>
              {daysLeft ?? formatDate(offer.responseDeadline)}
            </Text>
          </View>
        ) : null}
      </View>

      <PillButton label={awaiting ? S.respond : S.view} variant={awaiting ? "primary" : "tonal"} fullWidth onPress={open} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.medium, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  facts: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm },
  fact: { gap: SPACING.xxs },
  factRight: { alignItems: "flex-end" },
  factLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  money: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  factValue: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
});
