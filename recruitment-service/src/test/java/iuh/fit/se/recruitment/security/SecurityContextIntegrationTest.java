package iuh.fit.se.recruitment.security;

import iuh.fit.se.recruitment.config.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitConfig
@WebAppConfiguration
@ContextConfiguration(classes = SecurityContextIntegrationTest.TestConfiguration.class)
class SecurityContextIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    void rejectsDirectProtectedRequestWithoutTrustedUserHeaders() throws Exception {
        mockMvc.perform(get("/security-test/current-user"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createsSecurityContextFromCompleteTrustedUserHeaders() throws Exception {
        mockMvc.perform(get("/security-test/current-user")
                        .header(TrustedHeaderAuthenticationFilter.USER_ID_HEADER, "42")
                        .header(TrustedHeaderAuthenticationFilter.USER_EMAIL_HEADER, "recruiter@example.com")
                        .header(TrustedHeaderAuthenticationFilter.USER_ROLE_HEADER, "RECRUITER")
                        .header(TrustedHeaderAuthenticationFilter.DEPARTMENT_ID_HEADER, "7"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string("42|recruiter@example.com|RECRUITER|7"));
    }

    @Test
    void rejectsIncompleteTrustedUserHeaders() throws Exception {
        mockMvc.perform(get("/security-test/current-user")
                        .header(TrustedHeaderAuthenticationFilter.USER_ID_HEADER, "42")
                        .header(TrustedHeaderAuthenticationFilter.USER_ROLE_HEADER, "RECRUITER"))
                .andExpect(status().isUnauthorized());
    }

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, TrustedHeaderAuthenticationFilter.class, ProbeController.class})
    static class TestConfiguration {
    }

    @RestController
    static class ProbeController {

        @GetMapping(value = "/security-test/current-user", produces = MediaType.TEXT_PLAIN_VALUE)
        String currentUser() {
            CurrentUser user = CurrentUser.required();
            return user.userId() + "|" + user.email() + "|" + user.role() + "|" + user.departmentId();
        }
    }
}
