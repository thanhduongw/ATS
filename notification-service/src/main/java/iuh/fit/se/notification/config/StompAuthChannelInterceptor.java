package iuh.fit.se.notification.config;

import io.jsonwebtoken.Claims;
import iuh.fit.se.notification.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new AccessDeniedException("Thiếu token xác thực khi kết nối WebSocket");
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.isValid(token)) {
                throw new AccessDeniedException("Token không hợp lệ hoặc đã hết hạn");
            }

            Claims claims = jwtUtil.parseToken(token);
            String userId = claims.getSubject();

            Principal principal = () -> userId; // Principal đơn giản, getName() = userId dạng String
            accessor.setUser(principal);
        }

        return message;
    }
}