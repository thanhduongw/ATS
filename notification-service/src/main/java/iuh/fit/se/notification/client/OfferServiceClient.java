package iuh.fit.se.notification.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

/** Chỉ dùng để hỏi "người đang gọi có xem được thư mời này không" (offer-service tự kiểm phòng ban). */
@FeignClient(name = "offer-service", url = "${services.offer-service.url:http://localhost:8090}")
public interface OfferServiceClient {

    @GetMapping("/api/offer/offers/{id}")
    Map<String, Object> getOffer(@PathVariable("id") Long id);
}
