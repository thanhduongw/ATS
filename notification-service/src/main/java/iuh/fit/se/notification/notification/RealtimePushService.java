package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RealtimePushService {

    private final SimpMessagingTemplate messagingTemplate;

    public void pushToUser(Long recipientUserId, NotificationResponse notification) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientUserId), "/queue/notifications", notification);
    }
}