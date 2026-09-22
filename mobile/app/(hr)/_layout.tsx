import { Tabs } from "expo-router";
// Paper Icon chi nhan color?: string, con Tabs truyen ColorValue.
// MaterialCommunityIcons nhan dung ColorValue nen khong phai ep kieu.
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { sharedTabScreenOptions } from "@/lib/tab-options";

export default function RecruiterLayout() {
  return (
    <Tabs screenOptions={sharedTabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="requisitions/index"
        options={{
          title: "Yêu cầu TD",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-search" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
