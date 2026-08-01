package iuh.fit.se.auth.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_token")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(unique = true, nullable = false)
    private String token;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    private boolean revoked;

    public RefreshToken() {}

    public RefreshToken(Long id, Long userId, String token, LocalDateTime expiryDate, boolean revoked) {
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.expiryDate = expiryDate;
        this.revoked = revoked;
    }

    public static RefreshTokenBuilder builder() {
        return new RefreshTokenBuilder();
    }

    public static class RefreshTokenBuilder {
        private Long id;
        private Long userId;
        private String token;
        private LocalDateTime expiryDate;
        private boolean revoked;

        public RefreshTokenBuilder id(Long id) { this.id = id; return this; }
        public RefreshTokenBuilder userId(Long userId) { this.userId = userId; return this; }
        public RefreshTokenBuilder token(String token) { this.token = token; return this; }
        public RefreshTokenBuilder expiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; return this; }
        public RefreshTokenBuilder revoked(boolean revoked) { this.revoked = revoked; return this; }

        public RefreshToken build() {
            return new RefreshToken(id, userId, token, expiryDate, revoked);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; return; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }
}
