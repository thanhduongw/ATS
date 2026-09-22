import * as SecureStore from "expo-secure-store";

const ACCESS = "ats.accessToken";
const REFRESH = "ats.refreshToken";

/**
 * Lưu token vào Android Keystore qua SecureStore.
 *
 * Vì sao không dùng AsyncStorage: AsyncStorage để token dạng chữ thường trong SQLite
 * của app — máy đã root là đọc được. SecureStore đẩy giá trị vào Keystore của hệ điều hành.
 * (Ghi vào nhật ký quyết định — mục 15 của kế hoạch.)
 */
export const tokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS, accessToken),
      SecureStore.setItemAsync(REFRESH, refreshToken),
    ]);
  },

  async read() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
    ]);
    return { accessToken, refreshToken };
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS),
      SecureStore.deleteItemAsync(REFRESH),
    ]);
  },
};
