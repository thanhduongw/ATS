package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.CandidateRegistrationRequest;
import iuh.fit.se.auth.dto.request.ChangePasswordRequest;
import iuh.fit.se.auth.dto.request.CreateUserRequest;
import iuh.fit.se.auth.dto.request.ForgotPasswordRequest;
import iuh.fit.se.auth.dto.request.LoginRequest;
import iuh.fit.se.auth.dto.request.RefreshTokenRequest;
import iuh.fit.se.auth.dto.request.ResendOtpRequest;
import iuh.fit.se.auth.dto.request.ResetPasswordRequest;
import iuh.fit.se.auth.dto.request.UpdateCompanyRequest;
import iuh.fit.se.auth.dto.request.UpdateProfileRequest;
import iuh.fit.se.auth.dto.request.UpdateUserStatusRequest;
import iuh.fit.se.auth.dto.request.VerifyEmailRequest;
import iuh.fit.se.auth.dto.response.ApiMessageResponse;
import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.dto.response.UserDirectoryResponse;
import iuh.fit.se.auth.dto.response.UserProfileResponse;
import iuh.fit.se.auth.dto.response.UserSummaryResponse;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.security.AuthorizationPolicy;
import iuh.fit.se.auth.security.OAuth2TokenExchangeStore;
import iuh.fit.se.auth.service.CompanyService;
import iuh.fit.se.auth.service.LoginService;
import iuh.fit.se.auth.service.PasswordService;
import iuh.fit.se.auth.service.RegisterService;
import iuh.fit.se.auth.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final RegisterService registerService;
    private final LoginService loginService;
    private final UserService userService;
    private final PasswordService passwordService;
    private final CompanyService companyService;
    private final OAuth2TokenExchangeStore oAuth2TokenExchangeStore;

    public record OAuth2ExchangeRequest(@NotBlank String code) {}

    @PostMapping("/register")
    public ResponseEntity<ApiMessageResponse> registerCandidate(
            @Valid @RequestBody CandidateRegistrationRequest req) {
        registerService.registerCandidate(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiMessageResponse(
                "Candidate account created. Check your email for the verification OTP."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiMessageResponse> verify(@Valid @RequestBody VerifyEmailRequest req) {
        registerService.verifyEmail(req);
        return ResponseEntity.ok(new ApiMessageResponse("Email verified successfully"));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiMessageResponse> resendOtp(@Valid @RequestBody ResendOtpRequest req) {
        registerService.resendOtp(req);
        return ResponseEntity.ok(new ApiMessageResponse("A new OTP has been sent to your email"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(loginService.login(req));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(loginService.refreshToken(req.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiMessageResponse> logout(@Valid @RequestBody RefreshTokenRequest req) {
        loginService.logout(req.refreshToken());
        return ResponseEntity.ok(new ApiMessageResponse("Logged out successfully"));
    }

    @PostMapping("/oauth2/exchange")
    public ResponseEntity<LoginResponse> exchangeOAuth2Code(
            @Valid @RequestBody OAuth2ExchangeRequest req) {
        LoginResponse tokens = oAuth2TokenExchangeStore.consume(req.code());
        if (tokens == null) {
            throw new BusinessException("The login code is invalid or expired");
        }
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiMessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest req) {
        passwordService.forgotPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse(
                "If the email exists, a password reset OTP has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiMessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest req) {
        passwordService.resetPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse("Password reset successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiMessageResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest req) {
        CurrentUser actor = CurrentUser.required();
        passwordService.changePassword(actor.userId(), req);
        return ResponseEntity.ok(new ApiMessageResponse("Password changed successfully"));
    }

    /** Danh bạ đầy đủ gồm tài khoản ứng viên, email và trạng thái: quản trị viên hoặc tác vụ nội bộ. */
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'SYSTEM')")
    public ResponseEntity<List<UserSummaryResponse>> getUsers(
            @RequestParam(required = false) String role) {
        AuthorizationPolicy.requireAdminOrSystem(CurrentUser.required());
        return ResponseEntity.ok(userService.getUsers(role));
    }

    /** Internal-staff names for assignment pickers. No candidate accounts, no email, no status. */
    @GetMapping("/users/directory")
    public ResponseEntity<List<UserDirectoryResponse>> getUserDirectory(
            @RequestParam(required = false) String role) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(userService.getDirectory(role));
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiMessageResponse> createInternalUser(
            @Valid @RequestBody CreateUserRequest req) {
        userService.createUser(CurrentUser.required(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiMessageResponse("Internal user account created"));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiMessageResponse> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireAdmin(actor);
        userService.updateUserStatus(actor.userId(), id, req);
        return ResponseEntity.ok(new ApiMessageResponse("Account status updated"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile() {
        return ResponseEntity.ok(userService.getProfile(CurrentUser.required().userId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(CurrentUser.required().userId(), req));
    }

    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompany() {
        return ResponseEntity.ok(companyService.getCompanyInfo());
    }

    @PutMapping("/company")
    public ResponseEntity<CompanyResponse> updateCompany(
            @Valid @RequestBody UpdateCompanyRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(companyService.updateCompanyInfo(req));
    }
}
