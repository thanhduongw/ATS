package iuh.fit.se.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "otp_code", nullable = false)
    private String otpHash;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    public PasswordResetToken() {
    }

    public PasswordResetToken(Long id, String email, String otpHash,
                              LocalDateTime expiryDate, boolean used, int failedAttempts) {
        this.id = id;
        this.email = email;
        this.otpHash = otpHash;
        this.expiryDate = expiryDate;
        this.used = used;
        this.failedAttempts = failedAttempts;
    }

    public static PasswordResetTokenBuilder builder() { return new PasswordResetTokenBuilder(); }

    public static class PasswordResetTokenBuilder {
        private Long id;
        private String email;
        private String otpHash;
        private LocalDateTime expiryDate;
        private boolean used;
        private int failedAttempts;

        public PasswordResetTokenBuilder id(Long id) { this.id = id; return this; }
        public PasswordResetTokenBuilder email(String email) { this.email = email; return this; }
        public PasswordResetTokenBuilder otpHash(String otpHash) { this.otpHash = otpHash; return this; }
        public PasswordResetTokenBuilder expiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; return this; }
        public PasswordResetTokenBuilder used(boolean used) { this.used = used; return this; }
        public PasswordResetTokenBuilder failedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; return this; }
        public PasswordResetToken build() {
            return new PasswordResetToken(id, email, otpHash, expiryDate, used, failedAttempts);
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
    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }
}
