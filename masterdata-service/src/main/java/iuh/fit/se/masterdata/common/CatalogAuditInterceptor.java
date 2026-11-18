package iuh.fit.se.masterdata.common;

import iuh.fit.se.masterdata.config.RabbitMQConfig;
import iuh.fit.se.masterdata.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 3.11: mọi thao tác ghi thành công lên danh mục (thêm / sửa / xoá / đổi trạng thái) đều để lại một dòng nhật ký.
 * Làm ở một chỗ thay vì sửa 15 service: tên danh mục suy ra từ đường dẫn, mã bản ghi lấy từ đoạn số cuối cùng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogAuditInterceptor implements HandlerInterceptor {

    private static final String PREFIX = "/api/masterdata/";
    private static final Map<String, String> LABELS = Map.ofEntries(
            Map.entry("departments", "Phòng ban"),
            Map.entry("job-titles", "Chức danh"),
            Map.entry("job-levels", "Cấp bậc"),
            Map.entry("skills", "Kỹ năng"),
            Map.entry("work-locations", "Địa điểm làm việc"),
            Map.entry("employment-types", "Loại hình làm việc"),
            Map.entry("contract-types", "Loại hợp đồng"),
            Map.entry("education-levels", "Trình độ học vấn"),
            Map.entry("experience-levels", "Mức kinh nghiệm"),
            Map.entry("recruitment-sources", "Nguồn tuyển dụng"),
            Map.entry("recruitment-statuses", "Trạng thái tuyển dụng"),
            Map.entry("rejection-reasons", "Lý do từ chối"),
            Map.entry("interview-criteria", "Tiêu chí đánh giá"),
            Map.entry("email-templates", "Mẫu email"),
            Map.entry("pipelines", "Quy trình tuyển dụng"));

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String method = request.getMethod();
        if (ex != null || response.getStatus() >= 300 || "GET".equals(method) || "OPTIONS".equals(method)
                || "HEAD".equals(method)) {
            return;
        }
        String uri = request.getRequestURI();
        int at = uri.indexOf(PREFIX);
        if (at < 0) return;
        String[] parts = uri.substring(at + PREFIX.length()).split("/");
        String label = LABELS.get(parts[0]);
        if (label == null) return;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser actor)) return;

        Long resourceId = null;
        for (int i = parts.length - 1; i >= 1; i--) {
            if (parts[i].matches("\\d+")) {
                resourceId = Long.parseLong(parts[i]);
                break;
            }
        }
        // Mục danh mục không xoá hẳn: DELETE chỉ ẩn khỏi danh sách chọn, PATCH .../activate hiện lại.
        boolean reactivate = "activate".equals(parts[parts.length - 1]);
        String verb = switch (method) {
            case "POST" -> resourceId == null ? "Thêm mới" : "Cập nhật";
            case "DELETE" -> "Ẩn";
            default -> reactivate ? "Hiện lại" : "Cập nhật";
        };
        String action = switch (method) {
            case "POST" -> resourceId == null ? "CATALOG_CREATED" : "CATALOG_UPDATED";
            case "DELETE" -> "CATALOG_DEACTIVATED";
            default -> reactivate ? "CATALOG_ACTIVATED" : "CATALOG_UPDATED";
        };
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.ATS_EXCHANGE, RabbitMQConfig.AUDIT_LOG_ROUTING_KEY,
                    new AuditEvent(actor.userId(), action, "CATALOG", resourceId, verb + " · " + label,
                            LocalDateTime.now()));
        } catch (RuntimeException e) {
            log.warn("Không ghi được nhật ký danh mục: {}", e.getMessage());
        }
    }
}
