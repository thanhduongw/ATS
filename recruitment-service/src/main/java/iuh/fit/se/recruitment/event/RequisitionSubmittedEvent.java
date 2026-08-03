package iuh.fit.se.recruitment.event;

public record RequisitionSubmittedEvent(Long tenantId, Long requisitionId, Long approverId, String title) {}