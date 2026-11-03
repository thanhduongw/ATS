package iuh.fit.se.offer.offer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Quét thư mời đã gửi quá hạn phản hồi và chuyển sang "Hết hạn" (docs/UI R25; quyết định B4).
 * Hạn phản hồi lưu theo giờ Việt Nam (LocalDateTime), nên so với giờ hiện tại ở múi Asia/Ho_Chi_Minh
 * thay vì múi giờ mặc định của máy chủ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OfferExpiryJob {

    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OfferService offerService;

    @Scheduled(fixedDelayString = "${offer.expiry.scan-interval-ms:300000}",
            initialDelayString = "${offer.expiry.initial-delay-ms:60000}")
    public void expireOverdueOffers() {
        int expired = offerService.expireOverdue(LocalDateTime.now(VIETNAM));
        if (expired > 0) {
            log.info("Đã chuyển {} thư mời quá hạn phản hồi sang EXPIRED", expired);
        }
    }
}
