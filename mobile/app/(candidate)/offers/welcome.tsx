import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyProfile } from "@/features/profile/hooks";
import { IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, SIZES, SPACING } from "@/theme";

const S = STRINGS.welcome;

/**
 * Sau khi chấp nhận thư mời — giao diện canvas Mobile v2 N36, rút gọn: canvas có danh sách
 * "Bước tiếp theo" (giấy tờ, email công ty, ngày đầu tiên) nhưng backend không có dữ liệu đó,
 * nên chỉ giữ lời chúc + câu nói rõ nhà tuyển dụng sẽ liên hệ.
 */
export default function WelcomeScreen() {
  const { offerId, job } = useLocalSearchParams<{ offerId?: string; job?: string }>();
  const profile = useMyProfile();
  const insets = useSafeAreaInsets();
  const name = (profile.data?.fullName ?? "").trim().split(/\s+/).slice(-2).join(" ");

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.lg }]}
    >
      <View style={styles.top}>
        <IconTile icon="check" tone="success" shape="circle" size={SIZES.otpHeight + SPACING.lg} />
        <Text style={styles.title} accessibilityRole="header">
          {S.title(name)}
        </Text>
        <Text style={styles.message}>{S.message(job ?? "")}</Text>
      </View>

      <View style={styles.actions}>
        {offerId ? (
          <PillButton
            label={S.viewOffer}
            variant="tonal"
            fullWidth
            onPress={() => router.replace({ pathname: "/offers/[id]", params: { id: offerId } })}
          />
        ) : null}
        <PillButton label={S.home} fullWidth onPress={() => router.navigate("/jobs")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { flexGrow: 1, paddingHorizontal: SPACING.pageAuth, justifyContent: "space-between", gap: SPACING.xl },
  top: { gap: SPACING.md },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h1,
    lineHeight: FONT_SIZE.h1 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  message: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  actions: { gap: SPACING.sm2 },
});
