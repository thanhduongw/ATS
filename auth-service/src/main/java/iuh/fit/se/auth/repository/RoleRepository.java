package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}