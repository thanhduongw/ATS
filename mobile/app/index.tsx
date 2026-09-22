import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from "@/theme";

/**
 * Route "/" — expo-router yêu cầu app luôn có route khớp "/".
 * Màn này không tự điều hướng: AuthGate ở `app/_layout.tsx` thấy đang đứng ở gốc sẽ đẩy
 * sang khu vực đúng role (hoặc về đăng nhập). Ở đây chỉ hiện vòng quay trong lúc chờ.
 */
export default function IndexScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.body,
  },
});
