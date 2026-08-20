package iuh.fit.se.auth.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "company")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String name;

    private String address;

    private String phone;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "banner_url")
    private String bannerUrl;

    /** Số tháng lưu trữ dữ liệu ứng viên trước khi tự động ẩn danh hoá (GDPR). Null = không giới hạn. */
    @Column(name = "data_retention_months")
    private Integer dataRetentionMonths;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Company() {}

    public Company(Long id, Long tenantId, String name, String address, String phone,
                    String description, String logoUrl, String bannerUrl, Integer dataRetentionMonths,
                    LocalDateTime createdAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.description = description;
        this.logoUrl = logoUrl;
        this.bannerUrl = bannerUrl;
        this.dataRetentionMonths = dataRetentionMonths;
        this.createdAt = createdAt;
    }

    public static CompanyBuilder builder() {
        return new CompanyBuilder();
    }

    public static class CompanyBuilder {
        private Long id;
        private Long tenantId;
        private String name;
        private String address;
        private String phone;
        private String description;
        private String logoUrl;
        private String bannerUrl;
        private Integer dataRetentionMonths;
        private LocalDateTime createdAt;

        public CompanyBuilder id(Long id) { this.id = id; return this; }
        public CompanyBuilder tenantId(Long tenantId) { this.tenantId = tenantId; return this; }
        public CompanyBuilder name(String name) { this.name = name; return this; }
        public CompanyBuilder address(String address) { this.address = address; return this; }
        public CompanyBuilder phone(String phone) { this.phone = phone; return this; }
        public CompanyBuilder description(String description) { this.description = description; return this; }
        public CompanyBuilder logoUrl(String logoUrl) { this.logoUrl = logoUrl; return this; }
        public CompanyBuilder bannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; return this; }
        public CompanyBuilder dataRetentionMonths(Integer dataRetentionMonths) { this.dataRetentionMonths = dataRetentionMonths; return this; }
        public CompanyBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Company build() {
            return new Company(id, tenantId, name, address, phone, description, logoUrl, bannerUrl,
                    dataRetentionMonths, createdAt);
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
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }
    public Integer getDataRetentionMonths() { return dataRetentionMonths; }
    public void setDataRetentionMonths(Integer dataRetentionMonths) { this.dataRetentionMonths = dataRetentionMonths; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}