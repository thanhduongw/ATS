package iuh.fit.se.auth.dto.response;

/**
 * Minimal internal-staff directory entry used by workflow pickers (approver, interviewer,
 * assigned recruiter) and by cross-service name resolution. It deliberately omits email and
 * account status, and never contains candidate accounts, so a recruiter or hiring manager
 * cannot use it to enumerate candidate contact data.
 */
public record UserDirectoryResponse(
        Long id,
        String fullName,
        String role,
        Long departmentId
) {}
