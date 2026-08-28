package iuh.fit.se.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Tách riêng khỏi SecurityConfig để tránh circular dependency:
 * SecurityConfig -> OAuth2LoginSuccessHandler -> LoginService -> PasswordEncoder (trước đây định nghĩa trong SecurityConfig).
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
