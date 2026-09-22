import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";

/**
 * Khung chung của 3 màn đăng nhập / đăng ký / xác minh.
 *
 * Bám theo `.auth-form-side` + `.auth-form-container` của web: nền TRẮNG (khác nền
 * #F0F2F5 của phần còn lại), nội dung căn giữa, bề ngang tối đa 420, tiêu đề 24 đậm và
 * câu dẫn 14 màu xám.
 *
 * Web ẩn hẳn khối hero ở màn hẹp (`@media max-width: 768px`), nên ở đây chỉ giữ lại chữ
 * "ATS" cho app có nhận diện, không dựng hero — vừa đúng tinh thần bản web trên điện
 * thoại, vừa không cần gradient (xem ghi chú trong `theme/colors.ts`).
 *
 * BÀN PHÍM: `behavior="padding"` đặt cho CẢ HAI nền tảng, không để `undefined` trên Android.
 * Để `undefined` thì KeyboardAvoidingView không làm gì cả và bàn phím che mất ô đang nhập.
 * Không sợ đệm thừa: RN tính `frame.y + frame.height - keyboardY`, tức phần CHỒNG LẤN thật
 * giữa đáy khung và đỉnh bàn phím — Android đang để `adjustResize` nên cửa sổ tự co, phần
 * chồng lấn ra 0 và không đệm thêm; còn ở chế độ edge-to-edge (cửa sổ không co) thì mới đệm
 * đúng bằng chiều cao bàn phím. Xem
 * `react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js` (_relativeKeyboardHeight).
 */
export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>ATS</Text>

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {children}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cardBg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.xl,
  },
  container: { width: "100%", maxWidth: 420, alignSelf: "center" },
  brand: {
    fontFamily: FONT.bold,
    // Một-lần, cố ý để ngoài thang cỡ chữ: web để logo 48px trong khối hero rộng,
    // trên điện thoại 48 quá to nên hạ còn 40. Chỉ dùng đúng ở đây.
    fontSize: 40,
    letterSpacing: 3,
    textAlign: "center",
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  header: { alignItems: "center", marginBottom: SPACING.xl },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  footer: { alignItems: "center", marginTop: SPACING.lg },
});
