import Constants from "expo-constants";
import { Platform } from "react-native";
/**
 * Trong dev, điện thoại tải bundle từ Metro trên máy dev — mà backend cũng chạy trên
 * chính máy đó. Nên IP của Metro là IP của gateway. Suy ra từ đây thì đổi Wi-Fi
 * không phải sửa .env nữa.
 *
 * hostUri có dạng "192.168.1.154:8081". expoGoConfig?.debuggerHost là đường lui cho
 * Expo Go / bản SDK cũ.
 * CHỈ đúng ở LAN mode (mặc định). Chạy --tunnel thì hostUri là domain ngrok của Expo,
 * ghép cổng 8080 vào sẽ sai → khi đó phải đặt EXPO_PUBLIC_API_BASE_URL thủ công.
 */
const metroHost =
  // Chạy trên trình duyệt (`expo start --web`) thì không có hostUri; trang web và gateway
  // cùng nằm trên máy dev nên lấy luôn hostname của trang.
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.hostname
    : (Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost)?.split(":")[0];

/** Cổng API Gateway. Đổi cổng thì sửa .env, khỏi động vào code. */
const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "8080";

/**
 * Thứ tự ưu tiên:
 *   1. EXPO_PUBLIC_API_BASE_URL — bản production, hoặc khi cần trỏ sang server khác.
 *   2. Suy từ Metro — đường mặc định lúc dev.
 * Bản production không có Metro nên metroHost = undefined, buộc phải có (1).
 */
const raw =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (metroHost ? `http://${metroHost}:${API_PORT}/api` : undefined);

if (!raw) {
  throw new Error(
    "Không xác định được địa chỉ API. Chạy dev bằng LAN mode, " +
    "hoặc đặt EXPO_PUBLIC_API_BASE_URL trong mobile/.env."
  );
}

/** Base URL của API Gateway, ví dụ http:// */
export const API_BASE_URL = raw.replace(/\/+$/, "");