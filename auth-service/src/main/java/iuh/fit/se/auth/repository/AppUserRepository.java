package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByTenantIdAndEmail(Long tenantId, String email);
    boolean existsByTenantIdAndEmail(Long tenantId, String email);
    List<AppUser> findByTenantId(Long tenantId);
}