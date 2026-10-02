import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SPACING } from "@/theme";
import { BOTTOM_BAR_SPACE } from "./screen-chrome";

type Action = { label: string; onPress: () => void };
type Message = { text: string; action?: Action; key: number };

const SnackbarContext = createContext<(text: string, action?: Action) => void>(() => {});

/**
 * Snackbar dùng chung cho cả app (quy tắc 9: lỗi API hiện bằng Snackbar, không Alert).
 * Màn hình gọi `const notify = useSnackbar(); notify("…", { label, onPress })`.
 *
 * Đặt ở root layout nên snackbar vẫn còn khi màn gọi nó đã chuyển đi (ví dụ nộp đơn xong
 * chuyển sang "Đơn của tôi" rồi mới hiện câu báo thành công).
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const insets = useSafeAreaInsets();

  const notify = useCallback((text: string, action?: Action) => {
    setMessage({ text, action, key: Date.now() });
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        key={message?.key}
        visible={!!message}
        onDismiss={() => setMessage(null)}
        duration={message?.action ? 6000 : 4000}
        action={message?.action}
        // Nằm trên thanh tab/thanh hành động dưới đáy, không bị che.
        wrapperStyle={[styles.wrapper, { bottom: insets.bottom + BOTTOM_BAR_SPACE }]}
      >
        {message?.text}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: SPACING.sm },
});
