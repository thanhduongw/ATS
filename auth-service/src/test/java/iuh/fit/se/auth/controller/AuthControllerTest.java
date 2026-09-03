package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.exception.GlobalExceptionHandler;
import iuh.fit.se.auth.security.OAuth2TokenExchangeStore;
import iuh.fit.se.auth.service.CompanyService;
import iuh.fit.se.auth.service.LoginService;
import iuh.fit.se.auth.service.PasswordService;
import iuh.fit.se.auth.service.RegisterService;
import iuh.fit.se.auth.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private RegisterService registerService;
    @Mock private LoginService loginService;
    @Mock private UserService userService;
    @Mock private PasswordService passwordService;
    @Mock private CompanyService companyService;
    @Mock private OAuth2TokenExchangeStore oAuth2TokenExchangeStore;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
                registerService,
                loginService,
                userService,
                passwordService,
                companyService,
                oAuth2TokenExchangeStore
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void candidateSuppliedRoleAndDepartmentCannotReachRegistrationDomain() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Candidate",
                                  "email": "candidate@example.com",
                                  "password": "strong-password",
                                  "confirmPassword": "strong-password",
                                  "phone": "0900000000",
                                  "role": "COMPANY_ADMIN",
                                  "departmentId": 10
                                }
                                """))
                .andExpect(status().isCreated());

        verify(registerService).registerCandidate(argThat(request ->
                request.email().equals("candidate@example.com")
                        && request.getClass().getRecordComponents().length == 5));
    }

    @Test
    void forgotPasswordAlwaysReturnsGenericResponse() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"unknown@example.com"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "If the email exists, a password reset OTP has been sent"));

        verify(passwordService).forgotPassword(argThat(request ->
                request.email().equals("unknown@example.com")));
    }
}
