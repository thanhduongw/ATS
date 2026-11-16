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
    private final iuh.fit.se.auth.event.AuditEventPublisher auditEventPublisher;

    public CompanyResponse getCompanyInfo() {
        return toResponse(requireCompany());
    }

    public CompanyResponse getPublicCompany() {
        return getCompanyInfo();
    }

    /** Cập nhật kèm ghi nhật ký (3.11): ai sửa thông tin doanh nghiệp, có đổi chính sách / màu thương hiệu không. */
    @Transactional
    public CompanyResponse updateCompanyInfo(UpdateCompanyRequest req, Long actorUserId) {
        Company before = requireCompany();
        java.util.List<String> changed = new java.util.ArrayList<>();
        if (!java.util.Objects.equals(before.getName(), req.name())) changed.add("tên");
        if (!java.util.Objects.equals(before.getBrandColor(), req.brandColor())) changed.add("màu thương hiệu");
        if (!java.util.Objects.equals(before.getLogoUrl(), req.logoUrl())) changed.add("logo");
        if (!java.util.Objects.equals(before.getPrivacyPolicy(), req.privacyPolicy())) changed.add("chính sách bảo vệ dữ liệu");
        if (!java.util.Objects.equals(before.getDataRetentionMonths(), req.dataRetentionMonths())) changed.add("thời hạn lưu dữ liệu");
        if (!java.util.Objects.equals(before.getDataProtectionOfficerId(), req.dataProtectionOfficerId())) changed.add("người phụ trách dữ liệu");
        Long companyId = before.getId();
        CompanyResponse response = updateCompanyInfo(req);
        auditEventPublisher.publishSingleCompany(actorUserId, "COMPANY_UPDATED", "COMPANY", companyId,
                changed.isEmpty() ? "Cập nhật thông tin doanh nghiệp" : "Đổi: " + String.join(", ", changed));
        return response;
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin doanh nghiệp"));
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
