package iuh.fit.se.interview.client.dto;

/** Tom tat nguoi dung tu auth-service; departmentId dung de chon nguoi phong van cung phong ban voi ho so. */
public record UserSummaryResponse(Long id, String fullName, String email, String role, Long departmentId, String status) {}
