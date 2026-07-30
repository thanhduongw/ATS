package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.UpdateCompanyRequest;
import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.entity.Company;
import iuh.fit.se.auth.entity.Tenant;
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

    @Transactional
    public CompanyResponse updateCompanyInfo(Long tenantId, UpdateCompanyRequest req) {
        Company company = companyRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin công ty"));

        company.setName(req.name());
        companyRepository.save(company);

        return getCompanyInfo(tenantId);
    }
}
