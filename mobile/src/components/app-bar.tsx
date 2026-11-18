import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePublicCompany } from "@/features/company/hooks";
import { useUnreadCount } from "@/features/notifications/hooks";
import { IconButton } from "./ui/buttons";
import { CompanyLogo } from "./ui/surfaces";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";

/**
 * Thanh trên cùng của các màn tab khu ứng viên (Redesign-Final `.appbar`): logo + tên doanh nghiệp (Quản trị đặt trên
 * web) bên trái, nút chuông kèm số chưa đọc bên phải. Lịch phỏng vấn mới, đơn đổi vòng, thư mời… đều tới qua chuông.
 * Tự cộng khoảng tai thỏ/thanh trạng thái.
 */
export function CandidateAppBar() {
  const insets = useSafeAreaInsets();
  const company = usePublicCompany();
  const unread = useUnreadCount();
  const name = company.data?.name?.trim() || STRINGS.brand.name;

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.brand} accessibilityRole="header" accessibilityLabel={name}>
          <CompanyLogo uri={company.data?.logoUrl} />
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <IconButton
          icon="bell"
          label={STRINGS.notifications.open}
          badge={unread}
          onPress={() => router.push("/notifications")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.barBg,
    borderBottomWidth: SIZES.border,
    borderBottomColor: COLORS.border,
  },
  row: {
    height: SIZES.appBar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm2,
    paddingHorizontal: SPACING.page,
  },
  brand: { flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  name: { flexShrink: 1, fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
});
