package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.enums.UserStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public AppUser() {}

    public AppUser(Long id, Long tenantId, String email, String passwordHash, String fullName, Long roleId, UserStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.roleId = roleId;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static AppUserBuilder builder() {
        return new AppUserBuilder();
    }

    public static class AppUserBuilder {
        private Long id;
        private Long tenantId;
        private String email;
        private String passwordHash;
        private String fullName;
        private Long roleId;
        private UserStatus status;
        private LocalDateTime createdAt;

        public AppUserBuilder id(Long id) { this.id = id; return this; }
        public AppUserBuilder tenantId(Long tenantId) { this.tenantId = tenantId; return this; }
        public AppUserBuilder email(String email) { this.email = email; return this; }
        public AppUserBuilder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public AppUserBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public AppUserBuilder roleId(Long roleId) { this.roleId = roleId; return this; }
        public AppUserBuilder status(UserStatus status) { this.status = status; return this; }
        public AppUserBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public AppUser build() {
            return new AppUser(id, tenantId, email, passwordHash, fullName, roleId, status, createdAt);
        }
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}