import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { API_BASE_URL } from "@/config";
import { checkBackend, type HealthResult } from "@/lib/healthcheck";

/**
 * MÀN TẠM CỦA NGÀY 1 — chỉ để xác minh:
 *   (1) app mở được trên máy Android thật bằng dev build,
 *   (2) điện thoại gọi được API Gateway qua IP LAN.
 * Ngày 2 sẽ thay bằng điều hướng theo role (A1/A2/A3).
 */
export default function SmokeTestScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);

  async function run() {
    setLoading(true);
    setResult(await checkBackend());
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ATS Mobile</Text>
        <Text style={styles.subtitle}>Ngày 1 — kiểm tra nền móng</Text>

        <View style={styles.card}>
          <Text style={styles.label}>API_BASE_URL</Text>
          <Text style={styles.mono}>{API_BASE_URL}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={run}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kiểm tra kết nối backend</Text>
          )}
        </TouchableOpacity>

        {result !== null && (
          <View style={[styles.card, result.ok ? styles.okCard : styles.errCard]}>
            {result.ok ? (
              <>
                <Text style={styles.okText}>Kết nối được</Text>
                <Text style={styles.body}>
                  Gateway trả về {result.jobCount} tin tuyển dụng đang mở.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.errText}>Không kết nối được</Text>
                <Text style={styles.body}>{result.message}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7f9" },
  content: { padding: 20, paddingTop: 72, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, color: "#666", marginTop: -10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 6 },
  okCard: { backgroundColor: "#e7f6ec" },
  errCard: { backgroundColor: "#fdeceb" },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase" },
  mono: { fontFamily: "monospace", fontSize: 13, color: "#111" },
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
  okText: { fontSize: 16, fontWeight: "700", color: "#1b7f3b" },
  errText: { fontSize: 16, fontWeight: "700", color: "#c0392b" },
  button: {
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
