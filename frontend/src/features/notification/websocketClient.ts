import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient: Client | null = null;

export const connectNotificationSocket = (
    accessToken: string,
    onMessage: (payload: unknown) => void
): Client => {
    const client = new Client({
        webSocketFactory: () => new SockJS(`${import.meta.env.VITE_NOTIFICATION_WS_URL}/ws`),
        connectHeaders: {
            Authorization: `Bearer ${accessToken}`,
        },
        reconnectDelay: 5000,
        onConnect: () => {
            client.subscribe("/user/queue/notifications", (message) => {
                onMessage(JSON.parse(message.body));
            });
        },
    });

    client.activate();
    stompClient = client;
    return client;
};

export const disconnectNotificationSocket = () => {
    stompClient?.deactivate();
    stompClient = null;
};