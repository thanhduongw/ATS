import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient: Client | null = null;

/**
 * WebSocket nối thẳng notification-service (không qua Gateway).
 * .env: VITE_NOTIFICATION_WS_URL=http://localhost:8086
 */
export const connectNotificationSocket = (
    accessToken: string,
    onMessage: (payload: unknown) => void
): Client => {
    // Tránh double-connect
    if (stompClient?.active) {
        disconnectNotificationSocket();
    }

    const base =
        import.meta.env.VITE_NOTIFICATION_WS_URL || "http://localhost:8086";

    const client = new Client({
        webSocketFactory: () => new SockJS(`${base}/ws`),
        connectHeaders: {
            Authorization: `Bearer ${accessToken}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
            client.subscribe("/user/queue/notifications", (message) => {
                try {
                    onMessage(JSON.parse(message.body));
                } catch {
                    // ignore malformed
                }
            });
        },
        onStompError: (frame) => {
            console.warn("[WS] STOMP error", frame.headers["message"], frame.body);
        },
    });

    client.activate();
    stompClient = client;
    return client;
};

export const disconnectNotificationSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
};