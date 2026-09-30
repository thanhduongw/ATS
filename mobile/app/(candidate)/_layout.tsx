import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";

const T = STRINGS.tabs.candidate;
const DETAIL = { href: null, tabBarStyle: { display: "none" as const } };

export default function CandidateLayout() {
  const screenOptions = useTabScreenOptions();
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
        options={{ title: T.interviews, tabBarIcon: ({ color }) => <Icon name="calendar" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: T.profile, tabBarIcon: ({ color }) => <Icon name="person" color={color} /> }}
      />

      {/* Màn chi tiết: có route nhưng không có mục trên thanh tab, và ẩn luôn thanh tab
          (canvas M07, M09, M12 dùng thanh hành động dưới đáy thay cho thanh tab). */}
      <Tabs.Screen name="jobs/[id]" options={DETAIL} />
      <Tabs.Screen name="applications/[id]" options={DETAIL} />
      <Tabs.Screen name="offers/index" options={DETAIL} />
      <Tabs.Screen name="offers/[id]" options={DETAIL} />
    </Tabs>
  );
}
