import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "@/types/api";
import { notificationsApi } from "./api";

const KEY = ["notifications"] as const;

export const useNotifications = () =>
  useQuery({
    queryKey: KEY,
    queryFn: notificationsApi.list,
    // Mới nhất lên trên, không phụ thuộc thứ tự backend trả.
    select: (list) =>
      [...list].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
  });

/** Số chưa đọc, suy từ chính danh sách — khỏi gọi thêm `/unread-count`. */
export const useUnreadCount = () => {
  const q = useNotifications();
  return (q.data ?? []).filter((n) => !n.read).length;
};

/** Đánh dấu đã đọc ngay trên cache rồi mới gửi lên — bấm vào là chữ đậm tắt luôn. */
export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: (id: number) =>
      qc.setQueryData<NotificationResponse[]>(KEY, (list) =>
        list?.map((n) => (n.id === id ? { ...n, read: true } : n))
      ),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () =>
      qc.setQueryData<NotificationResponse[]>(KEY, (list) => list?.map((n) => ({ ...n, read: true }))),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
};
