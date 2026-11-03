package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.AcceptInvitationRequest;
import iuh.fit.se.auth.dto.request.InviteUserRequest;
import iuh.fit.se.auth.dto.response.ApiMessageResponse;
import iuh.fit.se.auth.dto.response.InvitationPreviewResponse;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.service.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Mời người dùng (docs/UI A03, A04; quyết định C2). */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    /** Quản trị doanh nghiệp gửi lời mời. */
    @PostMapping("/admin/invitations")
    public ResponseEntity<ApiMessageResponse> invite(@Valid @RequestBody InviteUserRequest req) {
        invitationService.invite(CurrentUser.required(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiMessageResponse("Đã gửi lời mời tới " + req.email().trim()));
    }

    /** Gửi lại lời mời cho tài khoản đang chờ kích hoạt. */
    @PostMapping("/admin/invitations/{userId}/resend")
    public ResponseEntity<ApiMessageResponse> resend(@PathVariable Long userId) {
        invitationService.resend(CurrentUser.required(), userId);
        return ResponseEntity.ok(new ApiMessageResponse("Đã gửi lại lời mời"));
    }

    /** Công khai: xem lời mời trước khi đặt mật khẩu. */
    @GetMapping("/invitations/{token}")
    public ResponseEntity<InvitationPreviewResponse> preview(@PathVariable String token) {
        return ResponseEntity.ok(invitationService.preview(token));
    }

    /** Công khai: đặt mật khẩu và kích hoạt tài khoản. */
    @PostMapping("/invitations/{token}/accept")
    public ResponseEntity<ApiMessageResponse> accept(
            @PathVariable String token, @Valid @RequestBody AcceptInvitationRequest req) {
        invitationService.accept(token, req);
        return ResponseEntity.ok(new ApiMessageResponse("Đã kích hoạt tài khoản. Bạn có thể đăng nhập."));
    }
}
