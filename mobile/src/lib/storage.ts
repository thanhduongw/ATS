import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS = "ats.accessToken";
const REFRESH = "ats.refreshToken";

/**
 * Lưu token vào Android Keystore qua SecureStore.
 *
 * Vì sao không dùng AsyncStorage: AsyncStorage để token dạng chữ thường trong SQLite
 * của app — máy đã root là đọc được. SecureStore đẩy giá trị vào Keystore của hệ điều hành.
 * (Ghi vào nhật ký quyết định — mục 15 của kế hoạch.)
 *
 * Trên trình duyệt (`expo start --web`, chỉ để xem thử giao diện lúc dev) SecureStore không
 * tồn tại, nên rơi về sessionStorage — mất khi đóng tab. KHÔNG phải đường chạy thật.
 */
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (k: string) => {
          try {
            return sessionStorage.getItem(k);
          } catch {
            return null;
          }
        },
        setItemAsync: async (k: string, v: string) => {
          try {
            sessionStorage.setItem(k, v);
          } catch {
            // trình duyệt chặn lưu trữ → phiên chỉ sống trong bộ nhớ
          }
        },
        deleteItemAsync: async (k: string) => {
          try {
            sessionStorage.removeItem(k);
          } catch {
            // như trên
          }
        },
      }
    : SecureStore;

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      store.setItemAsync(ACCESS, accessToken),
      store.setItemAsync(REFRESH, refreshToken),
    ]);
  },

  async read() {
    const [accessToken, refreshToken] = await Promise.all([
      store.getItemAsync(ACCESS),
      store.getItemAsync(REFRESH),
    ]);
    return { accessToken, refreshToken };
  },

  async clear() {
    await Promise.all([
      store.deleteItemAsync(ACCESS),
      store.deleteItemAsync(REFRESH),
    ]);
  },
};
