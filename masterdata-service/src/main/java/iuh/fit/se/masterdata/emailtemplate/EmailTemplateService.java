package iuh.fit.se.masterdata.emailtemplate;

import iuh.fit.se.masterdata.emailtemplate.dto.EmailTemplateRequest;
import iuh.fit.se.masterdata.emailtemplate.dto.EmailTemplateResponse;
import iuh.fit.se.masterdata.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository repository;

    public List<EmailTemplateResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByCodeAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public EmailTemplateResponse create(Long tenantId, EmailTemplateRequest req) {
        if (repository.existsByTenantIdAndCodeIgnoreCase(tenantId, req.code())) {
            throw new BusinessException("Mã mẫu email đã tồn tại");
        }
        EmailTemplate saved = repository.save(EmailTemplate.builder()
                .tenantId(tenantId)
                .code(req.code())
                .subject(req.subject())
                .body(req.body())
                .active(true)
                .build());
        return toResponse(saved);
    }

    @Transactional
    public EmailTemplateResponse update(Long tenantId, Long id, EmailTemplateRequest req) {
        EmailTemplate entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mẫu email"));
        entity.setCode(req.code());
        entity.setSubject(req.subject());
        entity.setBody(req.body());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        EmailTemplate entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mẫu email"));
        entity.setActive(false);
        repository.save(entity);
    }

    private EmailTemplateResponse toResponse(EmailTemplate e) {
        return new EmailTemplateResponse(e.getId(), e.getCode(), e.getSubject(), e.getBody(), e.isActive());
    }
}