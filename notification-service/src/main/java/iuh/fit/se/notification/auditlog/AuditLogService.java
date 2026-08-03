package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.auditlog.dto.AuditLogResponse;
import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;
    private final AuthServiceClient authServiceClient;

    public List<AuditLogResponse> search(
            Long tenantId, String resourceType, Long actorUserId, LocalDateTime from, LocalDateTime to) {

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            if (resourceType != null) predicates.add(cb.equal(root.get("resourceType"), resourceType));
            if (actorUserId != null) predicates.add(cb.equal(root.get("actorUserId"), actorUserId));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<AuditLog> logs = repository.findAll(spec,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));

        Map<Long, String> userNameMap = authServiceClient.getUsers(tenantId, null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));

        return logs.stream().map(l -> new AuditLogResponse(
                l.getId(), l.getActorUserId(), userNameMap.getOrDefault(l.getActorUserId(), "N/A"),
                l.getAction(), l.getResourceType(), l.getResourceId(), l.getMetadata(), l.getCreatedAt()
        )).toList();
    }
}