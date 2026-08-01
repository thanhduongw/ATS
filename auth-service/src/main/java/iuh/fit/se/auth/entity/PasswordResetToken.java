package iuh.fit.se.auth.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String otpCode; // Mã OTP 6 số đơn giản

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    private boolean used;

    public PasswordResetToken() {}

    public PasswordResetToken(Long id, Long tenantId, String email, String otpCode, LocalDateTime expiryDate, boolean used) {
        this.id = id;
        this.tenantId = tenantId;
        this.email = email;
        this.otpCode = otpCode;
        this.expiryDate = expiryDate;
        this.used = used;
    }

    public static PasswordResetTokenBuilder builder() {
        return new PasswordResetTokenBuilder();
    }

    public static class PasswordResetTokenBuilder {
        private Long id;
        private Long tenantId;
        private String email;
        private String otpCode;
        private LocalDateTime expiryDate;
        private boolean used;

        public PasswordResetTokenBuilder id(Long id) { this.id = id; return this; }
        public PasswordResetTokenBuilder tenantId(Long tenantId) { this.tenantId = tenantId; return this; }
        public PasswordResetTokenBuilder email(String email) { this.email = email; return this; }
        public PasswordResetTokenBuilder otpCode(String otpCode) { this.otpCode = otpCode; return this; }
        public PasswordResetTokenBuilder expiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; return this; }
        public PasswordResetTokenBuilder used(boolean used) { this.used = used; return this; }

        public PasswordResetToken build() {
            return new PasswordResetToken(id, tenantId, email, otpCode, expiryDate, used);
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
    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}
