package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.*;
import iuh.fit.se.auth.dto.response.*;
import iuh.fit.se.auth.service.*;
import jakarta.validation.Valid;
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

    @PostMapping("/register-company")
    public ResponseEntity<ApiMessageResponse> register(@Valid @RequestBody RegisterCompanyRequest req) {
        registerService.registerCompany(req);
        return ResponseEntity.ok(new ApiMessageResponse("Đăng ký thành công, vui lòng kiểm tra email để nhận mã OTP"));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiMessageResponse> resendOtp(@Valid @RequestBody ResendOtpRequest req) {
        registerService.resendOtp(req);
        return ResponseEntity.ok(new ApiMessageResponse("Mã OTP mới đã được gửi về email của bạn"));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiMessageResponse> verify(@Valid @RequestBody VerifyEmailRequest req) {
        registerService.verifyEmail(req);
        return ResponseEntity.ok(new ApiMessageResponse("Xác thực thành công"));
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

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiMessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        passwordService.forgotPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse("Yêu cầu đã được nhận. Token khôi phục mật khẩu (Base64URL) đã được gửi về email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordService.resetPassword(req);
        return ResponseEntity.ok(new ApiMessageResponse("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiMessageResponse> changePassword(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChangePasswordRequest req) {
        passwordService.changePassword(userId, req);
        return ResponseEntity.ok(new ApiMessageResponse("Đổi mật khẩu thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateUserProfile(userId, req));
    }

    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompany(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(companyService.getCompanyInfo(tenantId));
    }

    @PutMapping("/company")
    public ResponseEntity<CompanyResponse> updateCompany(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String requesterRole,
            @Valid @RequestBody UpdateCompanyRequest req) {
        if (!"COMPANY_ADMIN".equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được cập nhật thông tin công ty");
        }
        return ResponseEntity.ok(companyService.updateCompanyInfo(tenantId, req));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiMessageResponse> createUser(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String requesterRole,
            @Valid @RequestBody CreateUserRequest req) {

        if (!"COMPANY_ADMIN".equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được tạo tài khoản");
        }
        userService.createUser(tenantId, req);
        return ResponseEntity.ok(new ApiMessageResponse("Tạo tài khoản thành công"));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryResponse>> getUsers(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(userService.getUsers(tenantId, role));
    }

    @PatchMapping("/users/{targetUserId}/status")
    public ResponseEntity<ApiMessageResponse> updateUserStatus(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String requesterRole,
            @PathVariable Long targetUserId,
            @Valid @RequestBody UpdateUserStatusRequest req) {

        if (!"COMPANY_ADMIN".equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được quản lý trạng thái tài khoản nhân sự");
        }
        userService.updateUserStatus(tenantId, targetUserId, req.status());
        return ResponseEntity.ok(new ApiMessageResponse("Cập nhật trạng thái người dùng thành công"));
    }
}