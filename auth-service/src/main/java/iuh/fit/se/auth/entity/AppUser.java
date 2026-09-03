package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.enums.UserStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Locale;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String phone;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "department_id")
    private Long departmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default false")
    private boolean emailVerified;

    public AppUser() {}

    public AppUser(Long id, String email, String passwordHash, String fullName, String phone,
                   Long roleId, Long departmentId, UserStatus status, boolean emailVerified,
                   LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phone = phone;
        this.roleId = roleId;
        this.departmentId = departmentId;
        this.status = status;
        this.emailVerified = emailVerified;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static AppUserBuilder builder() {
        return new AppUserBuilder();
    }

    public static class AppUserBuilder {
        private Long id;
        private String email;
        private String passwordHash;
        private String fullName;
        private String phone;
        private Long roleId;
        private Long departmentId;
        private UserStatus status;
        private boolean emailVerified;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public AppUserBuilder id(Long id) { this.id = id; return this; }
        public AppUserBuilder email(String email) { this.email = email; return this; }
        public AppUserBuilder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public AppUserBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public AppUserBuilder phone(String phone) { this.phone = phone; return this; }
        public AppUserBuilder roleId(Long roleId) { this.roleId = roleId; return this; }
        public AppUserBuilder departmentId(Long departmentId) { this.departmentId = departmentId; return this; }
        public AppUserBuilder status(UserStatus status) { this.status = status; return this; }
        public AppUserBuilder emailVerified(boolean emailVerified) { this.emailVerified = emailVerified; return this; }
        public AppUserBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public AppUserBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public AppUser build() {
            return new AppUser(id, email, passwordHash, fullName, phone, roleId, departmentId,
                    status, emailVerified, createdAt, updatedAt);
        }
    }

    @PrePersist
    void prePersist() {
        normalizeEmail();
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        normalizeEmail();
        updatedAt = LocalDateTime.now();
    }

    private void normalizeEmail() {
        if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
