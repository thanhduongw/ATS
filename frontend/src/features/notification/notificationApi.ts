import axiosClient from "../../services/axiosClient";
import type { NotificationResponse } from "./types";

export const getNotifications = () =>
    axiosClient.get<NotificationResponse[]>("/notification/notifications");

export const getUnreadCount = () =>
    axiosClient.get<{ count: number }>("/notification/notifications/unread-count");

export const markAsRead = (id: number) =>
    axiosClient.patch(`/notification/notifications/${id}/read`);

export const markAllAsRead = () =>
    axiosClient.patch("/notification/notifications/read-all");