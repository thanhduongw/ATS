package iuh.fit.se.notification;

import iuh.fit.se.notification.auditlog.AuditLog;
import iuh.fit.se.notification.notification.Notification;
import iuh.fit.se.notification.notification.NotificationRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;

class SingleCompanyNotificationSchemaContractTest {

    @Test
    void persistedNotificationDataHasNoTenantScope() {
        for (Class<?> type : new Class<?>[]{Notification.class, AuditLog.class}) {
            assertFalse(Arrays.stream(type.getDeclaredFields())
                    .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        }
        assertFalse(Arrays.stream(NotificationRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
