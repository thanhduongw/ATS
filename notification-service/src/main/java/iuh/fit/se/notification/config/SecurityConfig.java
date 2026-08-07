package iuh.fit.se.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Handshake WebSocket: xác thực JWT được thực hiện riêng ở StompAuthChannelInterceptor
                        .requestMatchers("/ws/**").permitAll()
                        // Các endpoint REST còn lại: Gateway đã chặn phía trước; service tự tin header X-User-Id/X-Tenant-Id
                        .anyRequest().permitAll()
                );
        return http.build();
    }
}