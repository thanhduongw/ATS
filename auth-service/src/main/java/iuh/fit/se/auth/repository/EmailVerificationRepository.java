package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerification> findTopByEmailIgnoreCaseOrderByIdDesc(String email);
}
