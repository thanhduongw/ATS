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
        company.setAddress(req.address());
        company.setPhone(req.phone());
        company.setLegalName(req.legalName());
        company.setTaxCode(req.taxCode());
        company.setFoundedDate(req.foundedDate());
        company.setWebsite(req.website());
        company.setSizeRange(req.sizeRange());
        company.setRecruitingEmail(req.recruitingEmail());
        company.setBrandColor(req.brandColor());
        company.setDataProtectionOfficerId(req.dataProtectionOfficerId());
        // A08 "Cập nhật 01/07/2026": chỉ đổi mốc khi nội dung chính sách thật sự đổi.
        if (!java.util.Objects.equals(company.getPrivacyPolicy(), req.privacyPolicy())) {
            company.setPrivacyPolicy(req.privacyPolicy());
            company.setPrivacyPolicyUpdatedAt(java.time.LocalDateTime.now());
        }
        company.setTagline(req.tagline());
        company.setBenefits(req.benefits());
        return toResponse(companyRepository.save(company));
    }

    private Company requireCompany() {
        return companyRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new BusinessException("Company profile was not found"));
    }

    private CompanyResponse toResponse(Company company) {
        return new CompanyResponse(
                company.getId(), company.getName(), company.getDescription(), company.getLogoUrl(),
                company.getBannerUrl(), company.getDataRetentionMonths(),
                company.getAddress(), company.getPhone(), company.getLegalName(), company.getTaxCode(),
                company.getFoundedDate(), company.getWebsite(), company.getSizeRange(),
                company.getRecruitingEmail(), company.getBrandColor(), company.getDataProtectionOfficerId(),
                company.getPrivacyPolicy(), company.getPrivacyPolicyUpdatedAt(),
                company.getTagline(), company.getBenefits());
    }
}
