import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";

const T = STRINGS.tabs.candidate;
const DETAIL = { href: null, tabBarStyle: { display: "none" as const } };

/**
 * 4 tab theo `docs/UI/ATS-Candidate-Mobile-Redesign-Final.html` (chốt 19/11/2026):
 * Trang chủ · Việc làm · Đơn của tôi · Cá nhân. Không còn tab Lịch và tab Thông báo: thông báo mở từ nút chuông ở
 * thanh trên cùng; lịch phỏng vấn tới qua thông báo và nằm trong chi tiết đơn ứng tuyển.
 */
export default function CandidateLayout() {
  const screenOptions = useTabScreenOptions();

  return (
    // "history": quay lại từ màn chi tiết về đúng màn trước (mặc định "firstRoute" luôn về tab đầu).
    <Tabs screenOptions={screenOptions} backBehavior="history">
      <Tabs.Screen name="home" options={{ title: T.home, tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen
        name="jobs/index"
        options={{ title: T.jobs, tabBarIcon: ({ color }) => <Icon name="briefcase" color={color} /> }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{ title: T.applications, tabBarIcon: ({ color }) => <Icon name="document" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: T.profile, tabBarIcon: ({ color }) => <Icon name="person" color={color} /> }}
      />

      {/* Màn chi tiết: có route nhưng không có mục trên thanh tab, và ẩn luôn thanh tab
          (dùng thanh hành động dưới đáy thay cho thanh tab). */}
      <Tabs.Screen name="notifications" options={DETAIL} />
      <Tabs.Screen name="jobs/[id]" options={DETAIL} />
      <Tabs.Screen name="jobs/apply" options={DETAIL} />
      <Tabs.Screen name="applications/[id]" options={DETAIL} />
      <Tabs.Screen name="interviews/[id]" options={DETAIL} />
      <Tabs.Screen name="offers/index" options={DETAIL} />
      <Tabs.Screen name="offers/[id]" options={DETAIL} />
      <Tabs.Screen name="offers/welcome" options={DETAIL} />
      <Tabs.Screen name="profile-edit" options={DETAIL} />
    </Tabs>
  );
}
