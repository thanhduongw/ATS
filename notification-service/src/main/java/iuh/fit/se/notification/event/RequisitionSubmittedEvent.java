package iuh.fit.se.notification.event;

public record RequisitionSubmittedEvent(Long requisitionId, Long approverId, String title) {}