package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.enums.TenantStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tenant")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_code", unique = true, nullable = false)
    private String tenantCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TenantStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Tenant() {}

    public Tenant(Long id, String tenantCode, TenantStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.tenantCode = tenantCode;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static TenantBuilder builder() {
        return new TenantBuilder();
    }

    public static class TenantBuilder {
        private Long id;
        private String tenantCode;
        private TenantStatus status;
        private LocalDateTime createdAt;

        public TenantBuilder id(Long id) { this.id = id; return this; }
        public TenantBuilder tenantCode(String tenantCode) { this.tenantCode = tenantCode; return this; }
        public TenantBuilder status(TenantStatus status) { this.status = status; return this; }
        public TenantBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Tenant build() {
            return new Tenant(id, tenantCode, status, createdAt);
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
    public String getTenantCode() { return tenantCode; }
    public void setTenantCode(String tenantCode) { this.tenantCode = tenantCode; }
    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}