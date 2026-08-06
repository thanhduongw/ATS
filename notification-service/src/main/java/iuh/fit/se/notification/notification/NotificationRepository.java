package iuh.fit.se.notification.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByTenantIdAndRecipientUserIdOrderByCreatedAtDesc(Long tenantId, Long recipientUserId);
    long countByTenantIdAndRecipientUserIdAndReadFalse(Long tenantId, Long recipientUserId);
}