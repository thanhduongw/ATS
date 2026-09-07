package iuh.fit.se.masterdata.config;

import iuh.fit.se.masterdata.security.TrustedHeaderAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final TrustedHeaderAuthenticationFilter trustedHeaderAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, exception) -> response.sendError(401))
                        .accessDeniedHandler((request, response, exception) -> response.sendError(403)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error", "/swagger-ui/**", "/v3/api-docs/**",
                                "/api/masterdata/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/masterdata/departments/{id}/exists"
                        ).hasRole("COMPANY_ADMIN")
                        // Global read-only catalogs consumed by internal service automation that
                        // runs outside an HTTP request (public job rendering, and the offer-outcome
                        // event listener in application-service, which has no user identity to
                        // forward). /api/masterdata/** stays authenticated at the gateway, so these
                        // are reachable only from inside the private service network.
                        .requestMatchers(HttpMethod.GET,
                                "/api/masterdata/employment-types",
                                "/api/masterdata/work-locations",
                                "/api/masterdata/departments",
                                "/api/masterdata/rejection-reasons",
                                "/api/masterdata/pipelines/{id}"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(trustedHeaderAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
