import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyProfile } from "@/features/profile/hooks";
import { Card, Eyebrow, IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, LETTER_SPACING, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";

const S = STRINGS.welcome;

/**
 * Sau khi chấp nhận thư mời — Redesign-Final `views.welcome`: dấu tích, lời chúc, thẻ "Tiếp theo sẽ như thế nào?"
 * (3 bước chung, không phải dữ liệu riêng của đơn), nút xem lại thư mời và về Trang chủ.
 */
export default function WelcomeScreen() {
  const { offerId, job } = useLocalSearchParams<{ offerId?: string; job?: string }>();
  const profile = useMyProfile();
  const insets = useSafeAreaInsets();
  const name = (profile.data?.fullName ?? "").trim().split(/\s+/).pop() ?? "";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.lg },
      ]}
    >
      <View style={styles.top}>
        <IconTile icon="check" tone="success" size={SIZES.otpHeight + SPACING.md2} />
        <Eyebrow tone="brand">{S.kicker}</Eyebrow>
        <Text style={styles.title} accessibilityRole="header">
          {S.title(name)}
        </Text>
        <Text style={styles.message}>{S.message(job ?? "")}</Text>
      </View>

      <Card style={styles.steps}>
        <Text style={styles.stepsTitle}>{S.nextTitle}</Text>
        {S.steps.map((st, i) => (
          <View key={st.title} style={[styles.step, i < S.steps.length - 1 && styles.stepDivider]}>
            <View style={styles.stepNo}>
              <Text style={styles.stepNoText}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.stepTitle}>{st.title}</Text>
              <Text style={styles.stepBody}>{st.body}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        {offerId ? (
          <PillButton
            label={S.viewOffer}
            variant="outline"
            fullWidth
            onPress={() => router.replace({ pathname: "/offers/[id]", params: { id: offerId } })}
          />
        ) : null}
        <PillButton label={S.home} fullWidth onPress={() => router.navigate("/home")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { flexGrow: 1, paddingHorizontal: SPACING.pageAuth, gap: SPACING.lg },
  top: { alignItems: "center", gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    lineHeight: FONT_SIZE.h2 * LINE_HEIGHT.title,
    letterSpacing: LETTER_SPACING.title,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  message: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  steps: { gap: 0 },
  stepsTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  step: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.sm2 },
  stepDivider: { borderBottomWidth: SIZES.hairline, borderBottomColor: COLORS.divider },
  stepNo: {
    width: SIZES.iconButton,
    height: SIZES.iconButton,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNoText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
  stepTitle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  stepBody: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  actions: { gap: SPACING.sm2, marginTop: "auto" },
});
