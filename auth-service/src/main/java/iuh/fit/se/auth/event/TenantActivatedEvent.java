package iuh.fit.se.auth.event;

public record TenantActivatedEvent(Long tenantId, String tenantCode) {}