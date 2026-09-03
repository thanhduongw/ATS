package iuh.fit.se.recruitment.event;

public record RequisitionSubmittedEvent(Long requisitionId, Long approverId, String title) {}