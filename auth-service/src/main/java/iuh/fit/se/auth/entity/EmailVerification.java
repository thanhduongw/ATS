package iuh.fit.se.auth.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String email;

    @Column(name = "otp_code", nullable = false)
    private String otpCode;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    private boolean verified;

    public EmailVerification() {}

    public EmailVerification(Long id, Long tenantId, String email, String otpCode, LocalDateTime expiryDate, boolean verified) {
        this.id = id;
        this.tenantId = tenantId;
        this.email = email;
        this.otpCode = otpCode;
        this.expiryDate = expiryDate;
        this.verified = verified;
    }

    public static EmailVerificationBuilder builder() {
        return new EmailVerificationBuilder();
    }

    public static class EmailVerificationBuilder {
        private Long id;
        private Long tenantId;
        private String email;
        private String otpCode;
        private LocalDateTime expiryDate;
        private boolean verified;

        public EmailVerificationBuilder id(Long id) { this.id = id; return this; }
        public EmailVerificationBuilder tenantId(Long tenantId) { this.tenantId = tenantId; return this; }
        public EmailVerificationBuilder email(String email) { this.email = email; return this; }
        public EmailVerificationBuilder otpCode(String otpCode) { this.otpCode = otpCode; return this; }
        public EmailVerificationBuilder expiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; return this; }
        public EmailVerificationBuilder verified(boolean verified) { this.verified = verified; return this; }

        public EmailVerification build() {
            return new EmailVerification(id, tenantId, email, otpCode, expiryDate, verified);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }
    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
}