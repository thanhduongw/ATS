import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { NOTIFICATION_WS_URL } from "../../config";

let stompClient: Client | null = null;

/**
 * SockJS/STOMP đi qua entrypoint công khai: browser -> nginx -> api-gateway -> notification-service.
 * Không cần publish port 8086; handshake là public ở gateway còn JWT bị bắt buộc ở STOMP CONNECT.
 */
export const connectNotificationSocket = (
    accessToken: string,
    onMessage: (payload: unknown) => void
): Client => {
    // Tránh double-connect
    if (stompClient?.active) {
        disconnectNotificationSocket();
    }

    const client = new Client({
        webSocketFactory: () => new SockJS(NOTIFICATION_WS_URL),
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