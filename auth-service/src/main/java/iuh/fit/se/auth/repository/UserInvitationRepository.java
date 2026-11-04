package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserInvitationRepository extends JpaRepository<UserInvitation, Long> {
    Optional<UserInvitation> findByTokenHash(String tokenHash);

    List<UserInvitation> findByUserIdAndAcceptedAtIsNullAndRevokedFalse(Long userId);

    Optional<UserInvitation> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
}
