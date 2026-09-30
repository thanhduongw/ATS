import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";

const T = STRINGS.tabs.hr;

// Cấu trúc tab HR sẽ đổi ở đợt 8 theo phạm vi kế hoạch v1 (D1–D3). Đợt này chỉ đổi giao diện.
export default function RecruiterLayout() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: T.home, tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="requisitions/index"
        options={{ title: T.requisitions, tabBarIcon: ({ color }) => <Icon name="clipboardCheck" color={color} /> }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{ title: T.applications, tabBarIcon: ({ color }) => <Icon name="people" color={color} /> }}
      />
    </Tabs>
  );
}
