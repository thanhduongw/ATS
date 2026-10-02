import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";
import { useUnreadCount } from "@/features/notifications/hooks";
import { useMyInterviews, useMyPendingSlots } from "@/features/interviews/hooks";

const T = STRINGS.tabs.candidate;
const DETAIL = { href: null, tabBarStyle: { display: "none" as const } };

/**
 * 5 tab theo canvas Mobile v2 (N26): Việc làm · Hồ sơ · Lịch · Thông báo · Tôi.
 * v2 có tab "Tin nhắn" nhưng backend không có nhắn tin → thay bằng Thông báo (chốt 02/10/2026).
 */
export default function CandidateLayout() {
  const screenOptions = useTabScreenOptions();
  const unread = useUnreadCount();
  const slots = useMyPendingSlots();
  const interviews = useMyInterviews();
  // Việc đang chờ ứng viên ở tab Lịch: khung giờ cần báo rảnh + buổi cần xác nhận.
  const todo =
    (slots.data?.length ?? 0) + (interviews.data ?? []).filter((iv) => iv.status === "HM_CONFIRMED").length;
  const badge = (n: number) => (n > 0 ? (n > 9 ? "9+" : n) : undefined);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="jobs/index"
        options={{ title: T.jobs, tabBarIcon: ({ color }) => <Icon name="briefcase" color={color} /> }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{ title: T.applications, tabBarIcon: ({ color }) => <Icon name="document" color={color} /> }}
      />
      <Tabs.Screen
        name="interviews/index"
        options={{
          title: T.interviews,
          tabBarBadge: badge(todo),
          tabBarIcon: ({ color }) => <Icon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: T.notifications,
          tabBarBadge: badge(unread),
          tabBarIcon: ({ color }) => <Icon name="bell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: T.profile, tabBarIcon: ({ color }) => <Icon name="person" color={color} /> }}
      />

      {/* Màn chi tiết: có route nhưng không có mục trên thanh tab, và ẩn luôn thanh tab
          (canvas dùng thanh hành động dưới đáy thay cho thanh tab). */}
      <Tabs.Screen name="jobs/[id]" options={DETAIL} />
      <Tabs.Screen name="jobs/apply" options={DETAIL} />
      <Tabs.Screen name="applications/[id]" options={DETAIL} />
      <Tabs.Screen name="interviews/schedule" options={DETAIL} />
      <Tabs.Screen name="offers/index" options={DETAIL} />
      <Tabs.Screen name="offers/[id]" options={DETAIL} />
      <Tabs.Screen name="offers/welcome" options={DETAIL} />
    </Tabs>
  );
}
