package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.*;
import iuh.fit.se.auth.dto.response.ApiMessageResponse;
import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.dto.response.UserSummaryResponse;
import iuh.fit.se.auth.service.LoginService;
import iuh.fit.se.auth.service.RegisterService;
import iuh.fit.se.auth.service.UserService;
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

    // Thêm vào class AuthController đã có
    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryResponse>> getUsers(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(userService.getUsers(tenantId, role));
    }
}