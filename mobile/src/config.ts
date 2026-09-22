const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!raw) {
  throw new Error(
    "Thiếu EXPO_PUBLIC_API_BASE_URL. Tạo file mobile/.env theo mẫu .env.example."
  );
}
/** Base URL của API Gateway, ví dụ http://192.168.0.111:8080/api */
export const API_BASE_URL = raw.replace(/\/+$/, "");
