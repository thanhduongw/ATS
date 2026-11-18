package iuh.fit.se.auth.event;

import iuh.fit.se.auth.config.RabbitMQConfig;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Ứng viên xoá dữ liệu cá nhân: khoá tài khoản, thu hồi mọi refresh token, xoá thông tin định danh
 * (email, họ tên, số điện thoại, ảnh đại diện) và đổi mật khẩu thành chuỗi ngẫu nhiên.
 * Email cũ được giải phóng nên người đó có thể đăng ký lại như một tài khoản mới.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CandidateDataDeletedListener {

    private final AppUserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @RabbitListener(queues = RabbitMQConfig.CANDIDATE_DATA_DELETED_QUEUE)
    @Transactional
    public void onCandidateDataDeleted(CandidateDataDeletedEvent event) {
        if (event == null || event.userId() == null) return;
        try {
            AppUser user = userRepository.findById(event.userId()).orElse(null);
            if (user == null) return;
            user.setEmail("da-xoa-" + user.getId() + "@deleted.invalid");
            user.setFullName("Ứng viên đã xoá dữ liệu");
            user.setPhone(null);
            user.setAvatarUrl(null);
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setStatus(UserStatus.LOCKED);
            userRepository.save(user);
            refreshTokenRepository.revokeAllActiveByUserId(user.getId());
            log.info("Da khoa va an danh hoa tai khoan {} theo yeu cau xoa du lieu", user.getId());
        } catch (Exception e) {
            log.error("Khong khoa duoc tai khoan {} sau khi xoa du lieu: {}", event.userId(), e.getMessage());
        }
    }
}
