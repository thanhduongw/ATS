package iuh.fit.se.notification.event;

public record RequisitionSubmittedEvent(Long tenantId, Long requisitionId, Long approverId, String title) {}