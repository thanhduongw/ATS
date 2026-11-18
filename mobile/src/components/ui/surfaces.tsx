import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import {
  COLORS, FONT, FONT_SIZE, LETTER_SPACING, LINE_HEIGHT, RADIUS, SIZES, SPACING, STATUS_TONES, readCachedLogoUrl, type StatusTone,
} from "@/theme";
import { STRINGS } from "@/lib/strings";
import { Icon, type IconName } from "./icon";

/**
 * Thẻ trắng phẳng của Redesign-Final (`.card`): viền 1px, bo 15, không đổ bóng. Truyền `onPress` thì cả thẻ bấm được.
 * Nội dung bên trong xếp dọc, cách nhau 12.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Tiêu đề khối trong thẻ ("Tiến trình", "Chi tiết đề nghị"). */
export function CardTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.cardTitleRow}>
      <Text style={styles.cardTitle}>{children}</Text>
      {right}
    </View>
  );
}

/**
 * Ô icon đầu dòng. `rounded` là ô vuông bo (thẻ việc làm, canvas M06); `circle` là ô tròn
 * (thông báo, canvas M14). Sắc độ lấy theo `STATUS_TONES` để khớp màu với chip.
 */
export function IconTile({
  icon,
  tone = "brand",
  shape = "rounded",
  size = SIZES.iconTile,
}: {
  icon: IconName;
  tone?: StatusTone;
  shape?: "rounded" | "circle";
  size?: number;
}) {
  const t = STATUS_TONES[tone];
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: shape === "circle" ? RADIUS.full : RADIUS.md,
          backgroundColor: tone === "brand" ? COLORS.primarySoft : t.bg,
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size / 2)} color={t.dot} />
    </View>
  );
}

/** Logo chữ của app trên nền màu chính (canvas M01 đăng nhập, M12 thư mời). */
export function BrandMark({ size = SIZES.otpWidth }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size / 3.6) }]} accessible={false}>
      <Text style={[styles.markText, { fontSize: Math.round(size / 2) }]}>{STRINGS.brand.mark}</Text>
    </View>
  );
}

/**
 * Logo doanh nghiệp do Quản trị tải lên ở web (`logoUrl` của `/auth/public/company`); chưa có logo thì chữ cái đầu
 * trên nền màu thương hiệu (`BrandMark`). Không truyền `uri` → dùng logo đã lưu ở lần mở trước.
 */
export function CompanyLogo({ uri, size = SIZES.logo }: { uri?: string | null; size?: number }) {
  const src = uri ?? readCachedLogoUrl();
  if (!src) return <BrandMark size={size} />;
  return (
    <Image
      source={{ uri: src }}
      resizeMode="contain"
      style={[styles.logo, { width: size, height: size, borderRadius: Math.round(size / 3.6) }]}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** Dòng chữ nhỏ viết hoa phía trên tiêu đề (`.eyebrow`: "CƠ HỘI NGHỀ NGHIỆP", "ĐƠN #12"). */
export function Eyebrow({ children, tone = "muted", style }: { children: string; tone?: "muted" | "brand"; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.eyebrow, tone === "brand" && styles.eyebrowBrand, style]} numberOfLines={1}>
      {children.toLocaleUpperCase("vi-VN")}
    </Text>
  );
}

/** Đường kẻ ngang mảnh giữa các phần trong một thẻ (`.divider`). */
export function Divider() {
  return <View style={styles.rule} />;
}

/** Dòng nhãn — giá trị, kẻ mảnh bên dưới (canvas M12 "Chi tiết đề nghị"). */
export function KeyValueRow({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.kv, !last && styles.divider]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === "string" ? <Text style={styles.kvValue}>{value}</Text> : value}
    </View>
  );
}

/** Dòng có icon trái + tiêu đề + dòng phụ, kẻ mảnh thụt vào sau icon (canvas M09). */
export function ListRow({
  icon,
  title,
  subtitle,
  right,
  last,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={styles.listRow}>
      {icon ? <Icon name={icon} color={COLORS.textSecondary} /> : null}
      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {!last ? <View style={[styles.insetDivider, { left: icon ? SIZES.icon + SPACING.sm2 : 0 }]} /> : null}
    </View>
  );
}

/** Hộp chú thích xám lồng trong thẻ (canvas M08: "Phỏng vấn kỹ thuật 10:00, 26/09"). */
export function InfoNote({
  children,
  icon = "info",
  tone = "neutral",
}: {
  children: string;
  icon?: IconName;
  /** `danger` cho cảnh báo cần chú ý (vd CV có nội dung bất thường). */
  tone?: "neutral" | "danger";
}) {
  const danger = tone === "danger";
  return (
    <View style={[styles.note, danger && styles.noteDanger]}>
      <Icon name={icon} size={SPACING.md} color={danger ? COLORS.errorText : COLORS.textSecondary} />
      <Text style={[styles.noteText, danger && styles.noteTextDanger]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm2,
  },
  cardPressed: { backgroundColor: COLORS.body },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  cardTitle: { flexShrink: 1, fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },

  tile: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  mark: {
    width: SIZES.otpWidth,
    height: SIZES.otpWidth,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h2, color: COLORS.textOnPrimary },
  logo: { backgroundColor: COLORS.cardBg },
  eyebrow: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.micro,
    letterSpacing: LETTER_SPACING.eyebrow,
    color: COLORS.textSecondary,
  },
  eyebrowBrand: { color: COLORS.primary },
  rule: { height: SIZES.border, backgroundColor: COLORS.divider },

  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm2,
    paddingVertical: SPACING.sm2,
  },
  divider: { borderBottomWidth: SIZES.hairline, borderBottomColor: COLORS.divider },
  // Nhãn không co lại: giá trị dài (địa chỉ, kỹ năng) xuống dòng ở cột phải, nhãn giữ một dòng.
  kvLabel: { flexShrink: 0, fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  kvValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
    minHeight: SIZES.control + SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  listRowText: { flex: 1, gap: SPACING.xxs },
  listRowTitle: { fontFamily: FONT.medium, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  listRowSubtitle: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  insetDivider: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: SIZES.hairline,
    backgroundColor: COLORS.divider,
  },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + SPACING.xxs,
    paddingHorizontal: SPACING.sm2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.fill,
  },
  noteText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  noteDanger: { backgroundColor: STATUS_TONES.danger.bg },
  noteTextDanger: { color: COLORS.errorText },
});
