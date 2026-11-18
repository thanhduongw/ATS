import axiosClient from "../../services/axiosClient";
import type { NotificationResponse } from "./types";

/** Phát trên `window` sau khi đổi trạng thái đã đọc ở ngoài chuông thông báo, để chuông tải lại số chưa đọc. */
export const NOTIFICATIONS_CHANGED_EVENT = "ats:notifications-changed";

export const getNotifications = () =>
    axiosClient.get<NotificationResponse[]>("/notification/notifications");

export const getUnreadCount = () =>
    axiosClient.get<{ count: number }>("/notification/notifications/unread-count");

export const markAsRead = (id: number) =>
    axiosClient.patch(`/notification/notifications/${id}/read`);

export const markAllAsRead = () =>
    axiosClient.patch("/notification/notifications/read-all");