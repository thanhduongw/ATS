package iuh.fit.se.recruitment.event;

// Khớp field JSON với event publisher bên candidate-service (sẽ tạo ở Phase 4)
public record ApplicationCreatedEvent(Long jobPostingId, Long applicationId) {}