package iuh.fit.se.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.auth.dto.response.CareersPageResponse;
import iuh.fit.se.auth.entity.CareersPage;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.CareersPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

/** A09/A10: bản nháp (lưu tự động) và xuất bản trang tuyển dụng. */
@Service
@RequiredArgsConstructor
public class CareersPageService {

    private static final long ID = 1L;
    private final CareersPageRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private CareersPage page() {
        return repository.findById(ID).orElseGet(() -> CareersPage.builder().id(ID).build());
    }

    private static CareersPageResponse toResponse(CareersPage p, boolean includeDraft) {
        boolean changed = p.getDraftConfig() != null && !Objects.equals(p.getDraftConfig(), p.getPublishedConfig());
        return new CareersPageResponse(
                includeDraft ? p.getDraftConfig() : null,
                p.getPublishedConfig(),
                includeDraft ? p.getDraftUpdatedAt() : null,
                p.getPublishedAt(),
                includeDraft && changed);
    }

    public CareersPageResponse getForAdmin() {
        return toResponse(page(), true);
    }

    public CareersPageResponse getPublic() {
        return toResponse(page(), false);
    }

    @Transactional
    public CareersPageResponse saveDraft(String config) {
        try {
            objectMapper.readTree(config);
        } catch (Exception e) {
            throw new BusinessException("Cấu hình trang không hợp lệ");
        }
        CareersPage p = page();
        p.setDraftConfig(config);
        p.setDraftUpdatedAt(LocalDateTime.now());
        return toResponse(repository.save(p), true);
    }

    @Transactional
    public CareersPageResponse publish(Long userId) {
        CareersPage p = page();
        if (p.getDraftConfig() == null) throw new BusinessException("Chưa có nội dung để xuất bản");
        p.setPublishedConfig(p.getDraftConfig());
        p.setPublishedAt(LocalDateTime.now());
        p.setPublishedBy(userId);
        return toResponse(repository.save(p), true);
    }
}
