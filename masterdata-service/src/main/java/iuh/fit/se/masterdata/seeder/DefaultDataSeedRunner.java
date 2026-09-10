package iuh.fit.se.masterdata.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Nap danh muc mac dinh ngay sau khi ung dung khoi dong.
 * Seeder idempotent nen chay lai moi lan boot khong sinh du lieu trung;
 * tat bang app.masterdata.seed-defaults=false neu khong muon tu dong nap.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.masterdata.seed-defaults", havingValue = "true", matchIfMissing = true)
public class DefaultDataSeedRunner implements ApplicationRunner {

    private final DefaultDataSeeder seeder;

    @Override
    public void run(ApplicationArguments args) {
        try {
            seeder.seedDefaults();
            log.info("Da nap xong danh muc mac dinh cho masterdata.");
        } catch (Exception e) {
            log.error("Nap danh muc mac dinh that bai: {}", e.getMessage(), e);
        }
    }
}
