package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.*;
import iuh.fit.se.auth.dto.response.*;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.security.OAuth2TokenExchangeStore;
import iuh.fit.se.auth.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/register-company")
    public ResponseEntity<ApiMessageResponse> register(@Valid @RequestBody RegisterCompanyRequest req) {
        registerService.registerCompany(req);
        return ResponseEntity.ok(new ApiMessageResponse("Đăng ký thành công, vui lòng kiểm tra email để xác thực"));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiMessageResponse> verify(@Valid @RequestBody VerifyEmailRequest req) {
        registerService.verifyEmail(req);
        return ResponseEntity.ok(new ApiMessageResponse("Xác thực thành công"));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiMessageResponse> resendOtp(@Valid @RequestBody ResendOtpRequest req) {
        registerService.resendOtp(req);
        return ResponseEntity.ok(new ApiMessageResponse("Mã OTP mới đã được gửi tới email của bạn"));
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
        return ResponseEntity.ok(new ApiMessageResponse("Đăng xuất thành công"));
    }

    /** Đổi mã dùng-một-lần (sau khi Google SSO thành công) lấy access/refresh token thật. */
    @PostMapping("/oauth2/exchange")
    public ResponseEntity<LoginResponse> exchangeOAuth2Code(@Valid @RequestBody OAuth2ExchangeRequest req) {
        LoginResponse tokens = oAuth2TokenExchangeStore.consume(req.code());
        if (tokens == null) {
            throw new BusinessException("Mã đăng nhập không hợp lệ hoặc đã hết hạn");
        }
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiMessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        passwordService.forgotPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse("Mã OTP khôi phục mật khẩu đã được gửi tới email của bạn"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordService.resetPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse("Khôi phục mật khẩu thành công"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiMessageResponse> changePassword(
            @RequestHeader("X-User-Id") Long actorUserId,
            @Valid @RequestBody ChangePasswordRequest req) {
        passwordService.changePassword(actorUserId, req);
        return ResponseEntity.ok(new ApiMessageResponse("Đổi mật khẩu thành công"));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryResponse>> getUsers(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(userService.getUsers(tenantId, role));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiMessageResponse> createUser(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String requesterRole,
            @Valid @RequestBody CreateUserRequest req) {

        if (!"COMPANY_ADMIN".equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được tạo tài khoản");
        }
        userService.createUser(tenantId, actorUserId, req);
        return ResponseEntity.ok(new ApiMessageResponse("Tạo tài khoản thành công"));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiMessageResponse> updateUserStatus(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String requesterRole,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest req) {

        if (!"COMPANY_ADMIN".equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được cập nhật trạng thái tài khoản");
        }
        userService.updateUserStatus(tenantId, actorUserId, id, req);
        return ResponseEntity.ok(new ApiMessageResponse("Cập nhật trạng thái tài khoản thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(userId, req));
    }

    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompany(
            @RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(companyService.getCompanyInfo(tenantId));
    }

    @PutMapping("/company")
    public ResponseEntity<CompanyResponse> updateCompany(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody UpdateCompanyRequest req) {
        if (!"COMPANY_ADMIN".equals(role)) {
            throw new AccessDeniedException("Chỉ Company Admin được cập nhật thông tin công ty");
        }
        return ResponseEntity.ok(companyService.updateCompanyInfo(tenantId, req));
    }
}