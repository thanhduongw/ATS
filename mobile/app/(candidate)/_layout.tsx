import { Tabs } from "expo-router";
// Paper Icon chi nhan color?: string, con Tabs truyen ColorValue.
// MaterialCommunityIcons nhan dung ColorValue nen khong phai ep kieu.
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { sharedTabScreenOptions } from "@/lib/tab-options";

export default function CandidateLayout() {
  return (
    <Tabs screenOptions={sharedTabScreenOptions}>
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: "Việc làm",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="briefcase-search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{
          title: "Đơn của tôi",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="interviews/index"
        options={{
          title: "Lịch PV",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} />,
        }}
      />

      {/* Màn chi tiết: có route nhưng không hiện trên thanh tab */}
      <Tabs.Screen name="jobs/[id]" options={{ href: null, title: "Chi tiết tin" }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null, title: "Chi tiết đơn" }} />
      <Tabs.Screen name="offers/index" options={{ href: null, title: "Thư mời" }} />
      <Tabs.Screen name="offers/[id]" options={{ href: null, title: "Chi tiết thư mời" }} />
    </Tabs>
  );
}
