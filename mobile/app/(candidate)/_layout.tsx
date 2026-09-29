import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";

const T = STRINGS.tabs.candidate;

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

      {/* Màn chi tiết: có route nhưng không hiện trên thanh tab */}
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null }} />
      <Tabs.Screen name="offers/index" options={{ href: null }} />
      <Tabs.Screen name="offers/[id]" options={{ href: null }} />
    </Tabs>
  );
}
