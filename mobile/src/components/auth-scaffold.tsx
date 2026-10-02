import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { IconButton, PillButton } from "./ui/buttons";
import { BrandMark, IconTile } from "./ui/surfaces";
import type { IconName } from "./ui/icon";

type Leading = "brand" | "back" | { icon: IconName };

/**
 * Khung chung của 5 màn auth, theo canvas M01–M05: nền xám trang, căn từ trên xuống,
 * lề 24. Trên cùng là một trong ba thứ (`leading`):
 *   - "brand": logo + tên app (màn đăng nhập, M01)
 *   - "back": nút quay lại tròn, cùng hàng với tiêu đề (M02, M04, M05)
 *   - { icon }: ô icon tròn lớn (xác minh email, M03)
 * rồi tới tiêu đề 30 + câu dẫn 16, rồi form.
 *
 * Điện thoại: phần đầu + form bám trên, `footer` ("Bạn là ứng viên?…") GHIM XUỐNG ĐÁY màn
 * — nội dung không bị dồn hết lên nửa trên. Bàn phím mở thì khoảng trống giữa co lại, phần
 * đầu và ô đang nhập đứng yên (không căn giữa theo chiều dọc — căn giữa làm cả khối nhảy).
 *
 * Màn rộng (trình duyệt, máy tính bảng ≥ 600): form nằm trong thẻ trắng căn giữa màn.
 *
 * BÀN PHÍM: `behavior="padding"` cho CẢ HAI nền tảng — xem "Bàn phím che ô nhập" trong
 * CLAUDE.md; cuộn không đóng bàn phím (`keyboardDismissMode="none"`).
 */
export function AuthScaffold({
  leading,
  title,
  subtitle,
  children,
  footer,
}: {
  leading: Leading;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= WIDE;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          wide
            ? styles.scrollWide
            : { paddingTop: insets.top + SPACING.xl + SPACING.sm, paddingBottom: insets.bottom + SPACING.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, wide && styles.card]}>
          <View style={styles.head}>
            {leading === "brand" ? (
              <Brand />
            ) : leading === "back" ? null : (
              <IconTile icon={leading.icon} shape="circle" size={SIZES.otpHeight + SPACING.sm} />
            )}

            <View style={styles.titleBlock}>
              {/* Nút quay lại nằm CÙNG HÀNG với tiêu đề (theo yêu cầu), không chiếm một hàng riêng. */}
              <View style={styles.titleRow}>
                {leading === "back" ? (
                  <IconButton icon="back" label={STRINGS.common.back} onPress={goBack} />
                ) : null}
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.form}>{children}</View>

          {footer ? <View style={[styles.footer, wide && styles.footerWide]}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Từ bề ngang này trở lên coi là màn rộng: form vào thẻ căn giữa. */
const WIDE = 600;

/** Mở thẳng một màn auth (không có lịch sử) thì "quay lại" về màn đăng nhập. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(auth)/login");
}

/** Logo chữ + tên app (canvas M01). */
function Brand() {
  return (
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel={STRINGS.brand.name}>
      <BrandMark />
      <View>
        <Text style={styles.brandName}>{STRINGS.brand.name}</Text>
        <Text style={styles.brandTagline}>{STRINGS.brand.tagline}</Text>
      </View>
    </View>
  );
}

/**
 * Hàng "Chưa nhận được mã? Gửi lại mã" (M03, M05). Đang đếm ngược thì nút mờ và hiện số giây,
 * để người dùng không bấm liên tục làm backend gửi hàng loạt email.
 */
export function ResendRow({
  prompt,
  secondsLeft,
  onResend,
}: {
  prompt: string;
  secondsLeft: number;
  onResend: () => void;
}) {
  return (
    <View style={styles.inlineRow}>
      <Text style={styles.muted}>{prompt}</Text>
      <PillButton
        variant="text"
        size="sm"
        label={secondsLeft > 0 ? STRINGS.auth.resendIn(secondsLeft) : STRINGS.auth.resend}
        disabled={secondsLeft > 0}
        onPress={onResend}
      />
    </View>
  );
}

/** Câu dẫn xám + liên kết cùng hàng ("Đã có tài khoản? Đăng nhập"), căn giữa. */
export function PromptLink({
  prompt,
  label,
  onPress,
  stacked,
}: {
  prompt?: string;
  label: string;
  onPress: () => void;
  /** Xếp dọc: câu dẫn ở trên, liên kết ở dưới (M01). */
  stacked?: boolean;
}) {
  return (
    <View style={stacked ? styles.stackedRow : styles.inlineRow}>
      {prompt ? <Text style={styles.muted}>{prompt}</Text> : null}
      <PillButton variant="text" size="sm" label={label} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.pageAuth },
  scrollWide: { justifyContent: "center", paddingVertical: SPACING.xxl },
  // Một-lần: trên máy tính bảng không để form kéo dài hết bề ngang.
  container: { flexGrow: 1, width: "100%", maxWidth: 420, alignSelf: "center" },
  card: {
    flexGrow: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  head: { gap: SPACING.md2, marginBottom: SPACING.lg },
  titleBlock: { gap: SPACING.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  title: {
    flexShrink: 1,
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h1,
    lineHeight: FONT_SIZE.h1 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  form: { gap: SPACING.md },
  // marginTop "auto" đẩy footer xuống đáy khi còn chỗ; hết chỗ (bàn phím mở) thì nằm ngay dưới form.
  footer: { marginTop: "auto", paddingTop: SPACING.lg, alignItems: "center" },
  footerWide: { marginTop: 0 },

  brand: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  brandName: { fontFamily: FONT.bold, fontSize: FONT_SIZE.section, color: COLORS.textPrimary },
  brandTagline: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.xs,
    // Một-lần: giãn chữ cho dòng chữ in hoa dưới logo, như canvas (0.04em).
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: SPACING.xxs,
  },
  stackedRow: { alignItems: "center", gap: SPACING.xxs },
  muted: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
});
