package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.UpdateCompanyRequest;
import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.entity.Company;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;

    public CompanyResponse getCompanyInfo() {
        return toResponse(requireCompany());
    }

    public CompanyResponse getPublicCompany() {
        return getCompanyInfo();
    }

    @Transactional
    public CompanyResponse updateCompanyInfo(UpdateCompanyRequest req) {
        Company company = requireCompany();
        company.setName(req.name());
        company.setDescription(req.description());
        company.setLogoUrl(req.logoUrl());
        company.setBannerUrl(req.bannerUrl());
        company.setDataRetentionMonths(req.dataRetentionMonths());
        return toResponse(companyRepository.save(company));
    }

    private Company requireCompany() {
        return companyRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new BusinessException("Company profile was not found"));
    }

    private CompanyResponse toResponse(Company company) {
        return new CompanyResponse(
                company.getId(), company.getName(), company.getDescription(), company.getLogoUrl(),
                company.getBannerUrl(), company.getDataRetentionMonths());
    }
}
