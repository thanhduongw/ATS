import { API_BASE_URL } from "@/config";

export type HealthResult =
  | { ok: true; jobCount: number }
  | { ok: false; message: string };

/**
 * Kiểm tra điện thoại có gọi được API Gateway không.
 * Dùng endpoint public để không cần token — đúng thứ cần xác minh ở bước 1.4.
 * Tạm thời dùng fetch (chưa có axios client, axios sẽ dựng ở ngày 2).
 */
export async function checkBackend(): Promise<HealthResult> {
  const url = `${API_BASE_URL}/recruitment/public/jobs`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, message: `Gateway trả về HTTP ${res.status}` };
    }
    const data: unknown = await res.json();
    if (!Array.isArray(data)) {
      return { ok: false, message: "Phản hồi không phải mảng job như mong đợi" };
    }
    return { ok: true, jobCount: data.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Lỗi hay gặp nhất ở bước 1.4: Windows Firewall chặn cổng 8080, hoặc khác Wi-Fi.
    return {
      ok: false,
      message:
        `Không nối được tới ${url}\n\n` +
        `Chi tiết: ${msg}\n\n` +
        `Thường do: (1) Windows Firewall chặn cổng 8080, ` +
        `(2) điện thoại khác mạng Wi-Fi với máy tính, ` +
        `(3) IP trong .env sai — máy dev đổi IP sau khi nối lại Wi-Fi.`,
    };
  }
}
