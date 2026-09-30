import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";

const LENGTH = 6;

/**
 * Ô OTP 6 chữ số của canvas (M03, M05): 6 ô vuông bo 16, ô đang chờ nhập có viền màu chính.
 *
 * Thực chất là MỘT TextInput trong suốt phủ lên 6 ô vẽ — nhờ vậy dán mã, tự điền mã từ SMS/
 * email (`autoComplete="one-time-code"`) và xóa lùi đều chạy như ô nhập thường, không phải
 * tự chuyển focus giữa 6 ô. Backend yêu cầu đúng `\d{6}` nên chỉ giữ lại chữ số.
 */
export function FormOtpField<T extends FieldValues>({
  control,
  name,
  label,
  message,
  autoFocus,
}: {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  message?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => {
        const code = typeof value === "string" ? value : "";
        return (
          <View style={styles.root}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <Pressable onPress={() => inputRef.current?.focus()} style={styles.row} accessible={false}>
              {Array.from({ length: LENGTH }, (_, i) => {
                const active = focused && (i === code.length || (i === LENGTH - 1 && code.length === LENGTH));
                return (
                  <View
                    key={i}
                    style={[styles.cell, active && styles.cellActive, !!message && styles.cellError]}
                  >
                    <Text style={styles.digit}>{code[i] ?? ""}</Text>
                  </View>
                );
              })}

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, LENGTH))}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  onBlur();
                }}
                autoFocus={autoFocus}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={LENGTH}
                caretHidden
                accessibilityLabel={label ?? STRINGS.auth.otpA11y}
                style={styles.hiddenInput}
              />
            </Pressable>

            {message ? <Text style={styles.error}>{message}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { gap: SPACING.sm },
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cell: {
    width: SIZES.otpWidth,
    height: SIZES.otpHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.fill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cellActive: { borderColor: COLORS.primary },
  cellError: { borderColor: COLORS.error },
  digit: { fontFamily: FONT.bold, fontSize: FONT_SIZE.h2, color: COLORS.textPrimary },
  // Phủ kín hàng ô và trong suốt: nhận chạm, bàn phím, dán, tự điền — nhưng không hiện ra.
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0, color: "transparent" },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
});
