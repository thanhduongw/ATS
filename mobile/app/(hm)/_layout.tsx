import { Tabs } from "expo-router";
// Paper Icon chi nhan color?: string, con Tabs truyen ColorValue.
// MaterialCommunityIcons nhan dung ColorValue nen khong phai ep kieu.
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { sharedTabScreenOptions } from "@/lib/tab-options";

export default function HiringManagerLayout() {
  return (
    <Tabs screenOptions={sharedTabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Cần duyệt",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-check" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="interviews/index"
        options={{
          title: "Phỏng vấn",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
