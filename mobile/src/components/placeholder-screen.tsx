import { ScrollView, StyleSheet, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useSignOut } from "@/lib/use-sign-out";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import type { Role } from "@/types/api";
import { ScreenHeader } from "./ui/screen-chrome";
import { Card, CardTitle, KeyValueRow } from "./ui/surfaces";
import { PillButton } from "./ui/buttons";

/**
 * Màn tạm cho các khu vực chưa làm. Mỗi đợt sau sẽ thay dần bằng màn thật.
 * Có sẵn nút đăng xuất để test được luồng auth.
 */
export function PlaceholderScreen({ title, note, back }: { title: string; note?: string; back?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const onSignOut = useSignOut();
  const P = STRINGS.placeholder;

  return (
    <>
      <ScreenHeader title={title} variant={back ? "compact" : "large"} back={back} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <Card>
          <CardTitle>{P.session}</CardTitle>
          <KeyValueRow label={P.email} value={user?.email ?? "—"} />
          <KeyValueRow
            label={P.role}
            value={user?.role ? (STRINGS.roles[user.role as Role] ?? user.role) : "—"}
            last={user?.departmentId == null}
          />
          {user?.departmentId != null ? (
            <KeyValueRow label={P.department} value={String(user.departmentId)} last />
          ) : null}
        </Card>

        <PillButton label={P.signOut} icon="logout" variant="danger" fullWidth onPress={onSignOut} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  note: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
});
