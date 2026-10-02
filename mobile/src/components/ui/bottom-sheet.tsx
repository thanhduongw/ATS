import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { IconButton } from "./buttons";

/**
 * Bottom sheet theo canvas M20: mép trên bo 32, nắm kéo, tiêu đề + dòng phụ + nút đóng.
 * Dựng bằng `Portal` + `Modal` của Paper — kế hoạch v1 cố ý không thêm thư viện sheet riêng.
 *
 * Có ô nhập bên trong (nộp đơn, chấm đánh giá) nên bọc KeyboardAvoidingView với
 * `behavior="padding"` cho CẢ HAI nền tảng — xem mục "Bàn phím che ô nhập" trong CLAUDE.md.
 */
export function BottomSheet({
  visible,
  onDismiss,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Nút hành động chính, dính đáy sheet. */
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} style={styles.modal} contentContainerStyle={styles.container}>
        <KeyboardAvoidingView behavior="padding">
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.sm2 }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <IconButton icon="close" label={STRINGS.common.close} onPress={onDismiss} />
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-end", margin: 0 },
  container: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    // Một-lần: sheet không cao quá 88% màn, còn chừa mép trên cho thấy màn phía sau.
    maxHeight: "88%",
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.page,
    gap: SPACING.sm2,
  },
  handle: {
    alignSelf: "center",
    width: SIZES.sheetHandleWidth,
    height: SIZES.sheetHandleHeight,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
  },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  headerText: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h3, color: COLORS.textPrimary },
  subtitle: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  body: { flexGrow: 0 },
  bodyContent: { gap: SPACING.sm2 },
  footer: { paddingTop: SPACING.xs },
});
