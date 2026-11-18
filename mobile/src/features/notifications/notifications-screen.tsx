import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips, type ChipOption } from "@/components/ui/search-and-filters";
import { IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { formatRelative } from "@/lib/format";
import { notificationHref, notificationVisual } from "@/lib/notification-routes";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { NotificationResponse } from "@/types/api";
import { useMarkAllRead, useMarkRead, useNotifications } from "./hooks";

const S = STRINGS.notifications;
type Filter = "all" | "unread";

/**
 * Thông báo, dùng chung cho mọi role — Redesign-Final: chip "Tất cả · Chưa đọc (N)", mỗi thông báo là một thẻ viền
 * mảnh; chưa đọc có vạch màu thương hiệu bên trái. Bấm vào = đánh dấu đã đọc + mở đúng màn.
 */
export function NotificationsScreen({ asTab = false }: { asTab?: boolean }) {
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const role = useAuthStore((s) => s.user?.role);
  const [filter, setFilter] = useState<Filter>("all");

  const list = query.data ?? [];
  const unread = list.filter((n) => !n.read);
  const shown = filter === "unread" ? unread : list;
  const chips: ChipOption<Filter>[] = [
    { key: "all", label: S.filterAll },
    { key: "unread", label: S.filterUnread, count: unread.length },
  ];

  const open = (n: NotificationResponse) => {
    if (!n.read && n.id != null) markRead.mutate(n.id);
    const href = notificationHref(n, role);
    if (href) router.push(href as never);
  };

  return (
    <>
      <ScreenHeader
        eyebrow={S.eyebrow}
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
        data={shown}
        keyExtractor={(n, i) => String(n.id ?? i)}
        renderItem={({ item }) => <NotificationRow n={item} onPress={() => open(item)} />}
        header={list.length ? <FilterChips options={chips} value={filter} onChange={setFilter} /> : undefined}
        empty={
          filter === "unread" && list.length
            ? { title: S.emptyUnreadTitle, message: S.emptyUnreadMessage }
            : { title: S.emptyTitle, message: S.emptyMessage }
        }
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
      <IconTile icon={v.icon} tone={v.tone} size={SIZES.iconButton} />
      <View style={styles.text}>
        <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={2}>
          {n.title}
        </Text>
        {n.message ? (
          <Text style={styles.message} numberOfLines={3}>
            {n.message}
          </Text>
        ) : null}
        <Text style={styles.time}>{formatRelative(n.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.sm2,
    padding: SPACING.sm2,
    borderRadius: RADIUS.md,
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  // `.notification.unread`: vạch màu thương hiệu bên trái + nền phớt màu.
  rowUnread: { borderLeftWidth: SIZES.accent, borderLeftColor: COLORS.primary, backgroundColor: COLORS.primaryFaint },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  titleUnread: { fontFamily: FONT.bold },
  message: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  time: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
});
