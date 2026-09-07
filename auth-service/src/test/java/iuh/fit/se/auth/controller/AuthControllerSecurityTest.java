package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.config.SecurityConfig;
import iuh.fit.se.auth.security.OAuth2LoginSuccessHandler;
import iuh.fit.se.auth.security.OAuth2TokenExchangeStore;
import iuh.fit.se.auth.security.TrustedHeaderAuthenticationFilter;
import iuh.fit.se.auth.service.CompanyService;
import iuh.fit.se.auth.service.LoginService;
import iuh.fit.se.auth.service.PasswordService;
import iuh.fit.se.auth.service.RegisterService;
import iuh.fit.se.auth.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, TrustedHeaderAuthenticationFilter.class})
class AuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private RegisterService registerService;
    @MockBean private LoginService loginService;
    @MockBean private UserService userService;
    @MockBean private PasswordService passwordService;
    @MockBean private CompanyService companyService;
    @MockBean private OAuth2TokenExchangeStore oAuth2TokenExchangeStore;
    @MockBean private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void recruiterCannotReadTheFullUserDirectory() throws Exception {
        mockMvc.perform(get("/api/auth/users")
                        .header("X-User-Id", "2")
                        .header("X-User-Email", "recruiter@example.com")
                        .header("X-User-Role", "RECRUITER")
                        .header("X-Department-Id", "10"))
                .andExpect(status().isForbidden());

        verify(userService, never()).getUsers(any());
    }

    @Test
    void internalRoleCanReadTheStaffDirectoryWithoutCandidateData() throws Exception {
        mockMvc.perform(get("/api/auth/users/directory")
                        .header("X-User-Id", "2")
                        .header("X-User-Email", "recruiter@example.com")
                        .header("X-User-Role", "RECRUITER")
                        .header("X-Department-Id", "10"))
                .andExpect(status().isOk());

        verify(userService).getDirectory(null);
        verify(userService, never()).getUsers(any());
    }

    @Test
    void candidateCannotReadTheStaffDirectory() throws Exception {
        mockMvc.perform(get("/api/auth/users/directory")
                        .header("X-User-Id", "4")
                        .header("X-User-Email", "candidate@example.com")
                        .header("X-User-Role", "CANDIDATE"))
                .andExpect(status().isForbidden());

        verify(userService, never()).getDirectory(any());
    }

    @Test
    void recruiterCannotCreateInternalUser() throws Exception {
        mockMvc.perform(post("/api/auth/admin/users")
                        .header("X-User-Id", "2")
                        .header("X-User-Email", "recruiter@example.com")
                        .header("X-User-Role", "RECRUITER")
                        .header("X-Department-Id", "10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(internalUserJson()))
                .andExpect(status().isForbidden());

        verify(userService, never()).createUser(any(), any());
    }

    @Test
    void candidateCannotCreateInternalUser() throws Exception {
        assertInternalUserCreationForbidden(
                "4", "candidate@example.com", "CANDIDATE", null);
    }

    @Test
    void hiringManagerCannotCreateInternalUser() throws Exception {
        assertInternalUserCreationForbidden(
                "3", "manager@example.com", "HIRING_MANAGER", "10");
    }

    @Test
    void companyAdminCanReachInternalUserCreation() throws Exception {
        mockMvc.perform(post("/api/auth/admin/users")
                        .header("X-User-Id", "1")
                        .header("X-User-Email", "admin@example.com")
                        .header("X-User-Role", "COMPANY_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(internalUserJson()))
                .andExpect(status().isCreated());

        verify(userService).createUser(any(), any());
    }

    @Test
    void logoutCanRevokeRefreshTokenWithoutAccessToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"opaque-refresh-token"}
                                """))
                .andExpect(status().isOk());

        verify(loginService).logout("opaque-refresh-token");
    }

    private String internalUserJson() {
        return """
                {
                  "fullName": "Recruiter",
                  "email": "recruiter@example.com",
                  "tempPassword": "temporary-password",
                  "role": "RECRUITER",
                  "phone": "0900000000",
                  "departmentId": 10,
                  "status": "ACTIVE"
                }
                """;
    }

    private void assertInternalUserCreationForbidden(
            String userId, String email, String role, String departmentId) throws Exception {
        var request = post("/api/auth/admin/users")
                .header("X-User-Id", userId)
                .header("X-User-Email", email)
                .header("X-User-Role", role)
                .contentType(MediaType.APPLICATION_JSON)
                .content(internalUserJson());
        if (departmentId != null) {
            request.header("X-Department-Id", departmentId);
        }

        mockMvc.perform(request).andExpect(status().isForbidden());
        verify(userService, never()).createUser(any(), any());
    }
}
