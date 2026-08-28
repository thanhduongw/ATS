package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.dto.UserSummaryResponse;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.scheduling.dto.SalaryProposalRequest;
import iuh.fit.se.interview.scheduling.dto.SalaryProposalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SalaryProposalService {

    private final SalaryProposalRepository repository;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public SalaryProposalResponse submit(Long tenantId, Long actorUserId, SalaryProposalRequest req) {
        String proposedByName = "Phòng ban";
        try {
            List<UserSummaryResponse> users = authServiceClient.getUsers(tenantId, null);
            if (users != null) {
                proposedByName = users.stream()
                        .filter(u -> u.id().equals(actorUserId))
                        .map(UserSummaryResponse::fullName)
                        .findFirst()
                        .orElse("Phòng ban");
            }
        } catch (Exception ignored) {
        }

        SalaryProposal proposal = SalaryProposal.builder()
                .tenantId(tenantId)
                .applicationId(req.applicationId())
                .interviewId(req.interviewId())
                .proposedSalary(req.proposedSalary())
                .comment(req.comment())
                .proposedById(actorUserId)
                .proposedByName(proposedByName)
                .status(SalaryProposalStatus.PENDING)
                .build();

        SalaryProposal saved = repository.save(proposal);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SalaryProposalResponse> getByApplicationId(Long tenantId, Long applicationId) {
        return repository.findByTenantIdAndApplicationIdOrderByCreatedAtDesc(tenantId, applicationId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SalaryProposalResponse approve(Long tenantId, Long actorUserId, String role, Long id) {
        AccessGuard.requireHr(role);

        SalaryProposal proposal = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đề xuất lương"));

        if (proposal.getStatus() != SalaryProposalStatus.PENDING) {
            throw new BusinessException("Chỉ duyệt được đề xuất đang chờ xử lý");
        }

        proposal.setStatus(SalaryProposalStatus.APPROVED);
        SalaryProposal saved = repository.save(proposal);
        return toResponse(saved);
    }

    private SalaryProposalResponse toResponse(SalaryProposal p) {
        return new SalaryProposalResponse(
                p.getId(),
                p.getApplicationId(),
                p.getInterviewId(),
                p.getProposedSalary(),
                p.getComment(),
                p.getProposedById(),
                p.getProposedByName(),
                p.getStatus(),
                p.getCreatedAt()
        );
    }
}
