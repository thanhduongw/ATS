package iuh.fit.se.masterdata.event;

import iuh.fit.se.masterdata.config.RabbitMQConfig;
import iuh.fit.se.masterdata.seeder.DefaultDataSeeder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TenantActivatedListener {

    private final DefaultDataSeeder defaultDataSeeder;

    @RabbitListener(queues = RabbitMQConfig.TENANT_ACTIVATED_QUEUE)
    public void handleTenantActivated(TenantActivatedEvent event) {
        log.info("Nhận event tenant.activated cho tenantId={}", event.tenantId());
        defaultDataSeeder.seedDefaults(event.tenantId());
    }
}