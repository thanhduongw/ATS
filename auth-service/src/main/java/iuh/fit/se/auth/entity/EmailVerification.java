package iuh.fit.se.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "otp_code", nullable = false)
    private String otpHash;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    private boolean verified;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    public EmailVerification() {
    }

    public EmailVerification(Long id, String email, String otpHash,
                             LocalDateTime expiryDate, boolean verified, int failedAttempts) {
        this.id = id;
        this.email = email;
        this.otpHash = otpHash;
        this.expiryDate = expiryDate;
        this.verified = verified;
        this.failedAttempts = failedAttempts;
    }

    public static EmailVerificationBuilder builder() { return new EmailVerificationBuilder(); }

    public static class EmailVerificationBuilder {
        private Long id;
        private String email;
        private String otpHash;
        private LocalDateTime expiryDate;
        private boolean verified;
        private int failedAttempts;

        public EmailVerificationBuilder id(Long id) { this.id = id; return this; }
        public EmailVerificationBuilder email(String email) { this.email = email; return this; }
        public EmailVerificationBuilder otpHash(String otpHash) { this.otpHash = otpHash; return this; }
        public EmailVerificationBuilder expiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; return this; }
        public EmailVerificationBuilder verified(boolean verified) { this.verified = verified; return this; }
        public EmailVerificationBuilder failedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; return this; }
        public EmailVerification build() {
            return new EmailVerification(id, email, otpHash, expiryDate, verified, failedAttempts);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }
    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }
}
