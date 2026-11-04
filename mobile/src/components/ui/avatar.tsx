import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES } from "@/theme";
import { initials } from "@/lib/format";

/**
 * Ô tròn chữ cái đầu (canvas UR02, UR07, UH01: "HM", "TN"). Một sắc độ thương hiệu cho mọi người —
 * canvas tô nhiều màu nhưng không gắn nghĩa, nên giữ một màu cho khỏi hardcode bảng màu riêng.
 */
export function Avatar({ name, size = SIZES.iconTile }: { name?: string | null; size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessible={false}>
      <Text style={[styles.text, { fontSize: size >= SIZES.iconTile ? FONT_SIZE.base : FONT_SIZE.micro }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: FONT.bold, color: COLORS.primaryDark },
});
