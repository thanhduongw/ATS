import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { Icon, type IconName } from "./ui/icon";

type NativeInputProps = Omit<
  TextInputProps,
  "value" | "onChangeText" | "onBlur" | "secureTextEntry" | "style" | "multiline"
>;

interface Props<T extends FieldValues> extends NativeInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Lỗi từ zod (`errors.x?.message`). */
  message?: string;
  /** Icon đầu ô, lấy trong bộ icon canvas. */
  icon?: IconName;
  /** Chú thích xám dưới ô ("Tối thiểu 8 ký tự"). Bị thay bằng lỗi khi có lỗi. */
  hint?: string;
  /** Thêm dấu * đỏ sau nhãn. */
  required?: boolean;
  /** Ô mật khẩu: che chữ và có nút mắt để hiện/ẩn. */
  password?: boolean;
  /** Ô nhiều dòng (nhận xét, lý do). */
  multiline?: boolean;
}

/**
 * Ô nhập dùng chung cho mọi form, theo Redesign-Final (`.field` + `.input`): nhãn đậm nhỏ phía trên, ô nền trắng
 * viền mảnh bo 10; đang nhập thì viền màu thương hiệu, lỗi thì viền đỏ. Nối react-hook-form — quy tắc 5: form KHÔNG dùng useState cho giá trị.
 * (`useState` duy nhất ở đây là trạng thái hiện/ẩn mật khẩu, không phải giá trị form.)
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  message,
  icon,
  hint,
  required,
  password,
  multiline,
  ...inputProps
}: Props<T>) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const hasError = !!message;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.root}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}>{STRINGS.common.required}</Text> : null}
          </Text>

          <View
            style={[
              styles.box,
              multiline && styles.boxMultiline,
              focused && styles.boxFocused,
              hasError && styles.boxError,
            ]}
          >
            {icon ? <Icon name={icon} size={SIZES.iconSm} color={COLORS.textSecondary} /> : null}
            <TextInput
              {...inputProps}
              accessibilityLabel={label}
              value={typeof value === "string" ? value : ""}
              onChangeText={onChange}
              onFocus={(e) => {
                setFocused(true);
                inputProps.onFocus?.(e);
              }}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              secureTextEntry={password && !revealed}
              multiline={multiline}
              textAlignVertical={multiline ? "top" : "center"}
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              style={[styles.input, multiline && styles.inputMultiline]}
            />
            {password ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={revealed ? STRINGS.common.hidePassword : STRINGS.common.showPassword}
                onPress={() => setRevealed((r) => !r)}
                hitSlop={SPACING.sm2}
              >
                <Icon name={revealed ? "eyeOff" : "eye"} size={SIZES.iconSm} color={COLORS.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {hasError ? (
            <Text style={styles.error}>{message}</Text>
          ) : hint ? (
            <Text style={styles.hint}>{hint}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { gap: SPACING.xs + SPACING.xxs },
  label: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  required: { color: COLORS.error },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    height: SIZES.control,
    paddingHorizontal: SPACING.sm2,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.cardBg,
    // Viền luôn có (cùng độ dày) nên lúc focus/lỗi chỉ đổi màu, ô không nhảy kích thước.
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
  },
  boxMultiline: {
    height: undefined,
    minHeight: SIZES.control * 2,
    alignItems: "flex-start",
    paddingVertical: SPACING.sm2,
  },
  boxFocused: { borderColor: COLORS.primary },
  boxError: { borderColor: COLORS.error },
  input: {
    flex: 1,
    padding: 0,
    // Trên web: tắt viền focus mặc định của trình duyệt — ô đã tự đổi viền sang màu thương hiệu khi đang nhập.
    outlineWidth: 0,
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  inputMultiline: { lineHeight: FONT_SIZE.md * LINE_HEIGHT.body },
  hint: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
});
