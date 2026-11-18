package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.client.ApplicationServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.OfferServiceClient;
import iuh.fit.se.notification.client.RecruitmentServiceClient;
import iuh.fit.se.notification.security.AuthorizationPolicy;
import iuh.fit.se.notification.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Lịch sử theo đối tượng (GET /audit-logs/resource): Chuyên viên tuyển dụng và Quản trị xem mọi đối tượng; Đại diện
 * phòng ban chỉ xem đối tượng mà chính họ mở được. Việc kiểm phòng ban giao cho service sở hữu đối tượng — lời gọi
 * Feign mang nguyên danh tính người dùng (FeignClientConfig), service đó trả 403/404 nếu đối tượng thuộc phòng khác.
 */
@Component
@RequiredArgsConstructor
public class AuditResourceAccess {

    private final ApplicationServiceClient applicationServiceClient;
    private final InterviewServiceClient interviewServiceClient;
    private final OfferServiceClient offerServiceClient;
    private final RecruitmentServiceClient recruitmentServiceClient;

    /** Các id người gọi được xem lịch sử, giữ nguyên thứ tự. */
    public List<Long> visibleIds(CurrentUser actor, String resourceType, List<Long> ids) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.COMPANY_ADMIN || role == AuthorizationPolicy.Role.RECRUITER) {
            return ids;
        }
        return ids.stream().filter(id -> canOpen(resourceType, id)).toList();
    }

    private boolean canOpen(String resourceType, Long id) {
        if (resourceType == null || id == null) return false;
        try {
            switch (resourceType) {
                case "APPLICATION" -> applicationServiceClient.getApplicationById(id);
                case "INTERVIEW" -> interviewServiceClient.getInterviewById(id);
                case "OFFER" -> offerServiceClient.getOffer(id);
                case "REQUISITION" -> recruitmentServiceClient.getRequisition(id);
                case "JOB_POSTING" -> recruitmentServiceClient.getPosting(id);
                // Người dùng, danh mục, doanh nghiệp…: lịch sử chỉ dành cho HR / Quản trị.
                default -> {
                    return false;
                }
            }
            return true;
        } catch (RuntimeException e) {
            return false; // 403 / 404 từ service sở hữu → không thuộc phòng của người gọi
        }
    }
}
