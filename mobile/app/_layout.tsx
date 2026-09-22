import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useAuthStore } from "@/store/authStore";
import { homeForRole } from "@/lib/routes";
import { COLORS, FONT_ASSETS, paperTheme } from "@/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function FullScreenLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

function AuthGate() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Chưa đọc xong SecureStore thì chưa biết đã đăng nhập hay chưa — điều hướng lúc này
    // sẽ nháy màn login rồi nhảy về.
    if (!hydrated) return;

    // useSegments() khai kiểu tuple độ dài cố định, nhưng ở "/" mảng thật sự RỖNG.
    // Ép về mảng thường để so sánh độ dài đúng với thực tế chạy.
    const segs = segments as readonly string[];
    const inAuthArea = segs[0] === "(auth)";
    // Ở "/" không tính là khu vực nào cả, nếu không người đã đăng nhập mở app lên sẽ kẹt
    // mãi ở màn chờ vì không khớp nhánh điều hướng nào.
    const atRoot = segs.length === 0;

    if (!user && !inAuthArea) {
      router.replace("/(auth)/login");
    } else if (user && (inAuthArea || atRoot)) {
      router.replace(homeForRole(user.role));
    }
  }, [hydrated, user, segments, router]);

  if (!hydrated) return <FullScreenLoader />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.body },
      }}
    />
  );
}

export default function RootLayout() {
  // Chờ font tải xong rồi mới vẽ, nếu không chữ sẽ nhảy từ font hệ thống sang Be Vietnam Pro.
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="dark" />
        {fontsLoaded ? <AuthGate /> : <FullScreenLoader />}
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.body,
  },
});
