package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findTopByTenantIdAndEmailOrderByIdDesc(Long tenantId, String email);
}