import { apiClient } from "@/api/client";
import type { NotificationResponse } from "@/types/api";

export const notificationsApi = {
  /** Trả mảng (không phân trang). */
  list: () =>
    apiClient.get<NotificationResponse[]>("/notification/notifications").then((r) => r.data),
  markRead: (id: number) => apiClient.patch(`/notification/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/notification/notifications/read-all"),
};
