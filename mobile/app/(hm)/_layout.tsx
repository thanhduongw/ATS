import { Tabs } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useTabScreenOptions } from "@/lib/tab-options";
import { STRINGS } from "@/lib/strings";

const T = STRINGS.tabs.hm;

export default function HiringManagerLayout() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: T.todo, tabBarIcon: ({ color }) => <Icon name="checkSquare" color={color} /> }}
      />
      <Tabs.Screen
        name="interviews/index"
        options={{ title: T.interviews, tabBarIcon: ({ color }) => <Icon name="calendar" color={color} /> }}
      />
    </Tabs>
  );
}
