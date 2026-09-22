import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth";
import { COLORS, FONT, FONT_SIZE, SHADOWS, SPACING } from "@/theme";

const ROLE_LABEL: Record<string, string> = {
  COMPANY_ADMIN: "Quản trị doanh nghiệp",
  RECRUITER: "Chuyên viên tuyển dụng",
  HIRING_MANAGER: "Quản lý tuyển dụng",
  CANDIDATE: "Ứng viên",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/**
 * Màn tạm cho các khu vực chưa làm. Mỗi ngày sau sẽ thay dần bằng màn thật.
 * Có sẵn nút đăng xuất để test được luồng auth ngay từ ngày 2.
 */
export function PlaceholderScreen({ title, note }: { title: string; note?: string }) {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const signOut = useAuthStore((s) => s.signOut);

  const onSignOut = async () => {
    // Báo backend thu hồi refresh token; hỏng cũng vẫn đăng xuất phía máy.
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // bỏ qua có chủ đích
    }
    await signOut();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Card style={styles.card} mode="contained">
        <Card.Content style={styles.cardContent}>
          <Text style={styles.cardTitle}>Phiên đăng nhập</Text>
          <Divider style={styles.divider} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row
            label="Vai trò"
            value={user?.role ? (ROLE_LABEL[user.role] ?? user.role) : "—"}
          />
          {user?.departmentId != null ? (
            <Row label="Phòng ban" value={String(user.departmentId)} />
          ) : null}
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        onPress={onSignOut}
        style={styles.signOut}
        contentStyle={styles.signOutContent}
        textColor={COLORS.error}
      >
        Đăng xuất
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    color: COLORS.textPrimary,
  },
  note: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.cardBg,
    boxShadow: SHADOWS.card,
  },
  cardContent: { paddingVertical: SPACING.md },
  cardTitle: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.h4,
    color: COLORS.textPrimary,
  },
  divider: { marginVertical: SPACING.sm, backgroundColor: COLORS.divider },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  rowLabel: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    flexShrink: 1,
    textAlign: "right",
  },
  signOut: { marginTop: SPACING.lg, borderColor: COLORS.error },
  signOutContent: { height: 44 },
});
