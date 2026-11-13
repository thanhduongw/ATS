import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";
import { useStaffTaskCount } from "@/features/staff/use-task-count";

const T = STRINGS.staff.tabs;
const DETAIL = { href: null, tabBarStyle: { display: "none" as const } };

/**
 * Chuyên viên tuyển dụng — 4 tab theo docs/UI UR01–UR19: Việc của tôi · Ứng viên · Lịch · Thêm. Chuông nằm ở góc phải
 * đầu màn (không phải một tab). Số trên tab "Việc của tôi" = số việc cần làm.
 */
export default function RecruiterLayout() {
  const screenOptions = useTabScreenOptions();
  const tasks = useStaffTaskCount();
  return (
    // "history": quay lại từ màn chi tiết về đúng màn trước (mặc định "firstRoute" luôn về tab đầu).
    <Tabs screenOptions={screenOptions} backBehavior="history">
      <Tabs.Screen
        name="index"
        options={{
          title: T.home,
          tabBarBadge: tasks > 0 ? (tasks > 9 ? "9+" : tasks) : undefined,
          tabBarIcon: ({ color }) => <Icon name="checkSquare" color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{ title: T.candidates, tabBarIcon: ({ color }) => <Icon name="people" color={color} /> }}
      />
      <Tabs.Screen
        name="interviews/index"
        options={{ title: T.schedule, tabBarIcon: ({ color }) => <Icon name="calendar" color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: T.more, tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }}
      />

      {/* Màn chi tiết: có route nhưng không có mục trên thanh tab, ẩn luôn thanh tab. */}
      <Tabs.Screen name="applications/[id]" options={DETAIL} />
      <Tabs.Screen name="interviews/[id]" options={DETAIL} />
      <Tabs.Screen name="evaluations/[id]" options={DETAIL} />
      <Tabs.Screen name="notifications" options={DETAIL} />
      <Tabs.Screen name="requisitions/index" options={DETAIL} />
      <Tabs.Screen name="requisitions/[id]" options={DETAIL} />
      <Tabs.Screen name="offers/index" options={DETAIL} />
      <Tabs.Screen name="jobs/[id]" options={DETAIL} />
      <Tabs.Screen name="search" options={DETAIL} />
      <Tabs.Screen name="settings" options={DETAIL} />
    </Tabs>
  );
}
