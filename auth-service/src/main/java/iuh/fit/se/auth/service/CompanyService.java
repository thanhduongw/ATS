package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.UpdateCompanyRequest;
import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.entity.Company;
import iuh.fit.se.auth.entity.Tenant;
import iuh.fit.se.auth.enums.TenantStatus;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.CompanyRepository;
import iuh.fit.se.auth.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final TenantRepository tenantRepository;

    public CompanyResponse getCompanyInfo(Long tenantId) {
        Company company = companyRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin công ty"));
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã công ty"));

        return new CompanyResponse(company.getId(), tenantId, company.getName(), tenant.getTenantCode());
    }

    /**
     * Public: lấy công ty theo tenantCode (chỉ khi ACTIVE).
     */
    public CompanyResponse getPublicByTenantCode(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank()) {
            throw new BusinessException("Mã công ty không hợp lệ");
        }
        Tenant tenant = tenantRepository.findByTenantCode(tenantCode.trim().toUpperCase())
                .orElseThrow(() -> new BusinessException("Không tìm thấy công ty với mã: " + tenantCode));

        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new BusinessException("Công ty này hiện không hoạt động");
        }

        Company company = companyRepository.findByTenantId(tenant.getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin công ty"));

        return new CompanyResponse(company.getId(), tenant.getId(), company.getName(), tenant.getTenantCode());
    }

    @Transactional
    public CompanyResponse updateCompanyInfo(Long tenantId, UpdateCompanyRequest req) {
        Company company = companyRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin công ty"));

        company.setName(req.name());
        companyRepository.save(company);

        return getCompanyInfo(tenantId);
    }
}