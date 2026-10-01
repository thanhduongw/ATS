import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { formatRelative } from "@/lib/format";
import { notificationHref, notificationVisual } from "@/lib/notification-routes";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { NotificationResponse } from "@/types/api";
import { useMarkAllRead, useMarkRead, useNotifications } from "./hooks";

const S = STRINGS.notifications;

type Row = { kind: "header"; label: string } | { kind: "item"; n: NotificationResponse };

/**
 * M14 — Thông báo (A4), dùng chung cho mọi role. Chưa đọc nằm nhóm "Mới" trên nền trắng,
 * đã đọc ở nhóm "Trước đó" trên nền trong suốt. Bấm vào = đánh dấu đã đọc + mở đúng màn.
 */
export function NotificationsScreen({ asTab = false }: { asTab?: boolean }) {
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const role = useAuthStore((s) => s.user?.role);

  const list = query.data ?? [];
  const unread = list.filter((n) => !n.read);
  const read = list.filter((n) => n.read);
  const rows: Row[] = [
    ...(unread.length ? [{ kind: "header", label: S.unread } as Row] : []),
    ...unread.map((n) => ({ kind: "item", n }) as Row),
    ...(read.length ? [{ kind: "header", label: S.earlier } as Row] : []),
    ...read.map((n) => ({ kind: "item", n }) as Row),
  ];

  const open = (n: NotificationResponse) => {
    if (!n.read && n.id != null) markRead.mutate(n.id);
    const href = notificationHref(n, role);
    if (href) router.push(href as never);
  };

  return (
    <>
      <ScreenHeader
        title={S.title}
        back={!asTab}
        actions={
          unread.length ? (
            <PillButton label={S.readAll} variant="text" size="sm" onPress={() => markAll.mutate()} />
          ) : undefined
        }
      />
      <QueryList
        query={query}
        data={list.length ? rows : []}
        keyExtractor={(r, i) => (r.kind === "header" ? `h-${r.label}` : String(r.n.id ?? i))}
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <Text style={styles.section}>{item.label}</Text>
          ) : (
            <NotificationRow n={item.n} onPress={() => open(item.n)} />
          )
        }
        empty={{ title: S.emptyTitle, message: S.emptyMessage }}
      />
    </>
  );
}

function NotificationRow({ n, onPress }: { n: NotificationResponse; onPress: () => void }) {
  const v = notificationVisual(n);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.title ?? ""}. ${n.message ?? ""}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !n.read && styles.rowUnread, pressed && styles.pressed]}
    >
      <IconTile icon={v.icon} tone={v.tone} shape="circle" size={SIZES.iconButton} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={2}>
            {n.title}
          </Text>
          <Text style={styles.time}>{formatRelative(n.createdAt)}</Text>
        </View>
        {n.message ? (
          <Text style={styles.message} numberOfLines={3}>
            {n.message}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.sm2,
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  row: { flexDirection: "row", gap: SPACING.sm2, padding: SPACING.sm2, borderRadius: RADIUS.xl },
  rowUnread: { backgroundColor: COLORS.cardBg },
  pressed: { backgroundColor: COLORS.fill },
  text: { flex: 1, gap: SPACING.xxs },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  title: { flex: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  titleUnread: { fontFamily: FONT.bold },
  time: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  message: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
});
