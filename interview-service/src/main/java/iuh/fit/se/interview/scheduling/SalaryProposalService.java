package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.dto.UserSummaryResponse;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.Interview;
import iuh.fit.se.interview.interview.InterviewRepository;
import iuh.fit.se.interview.interview.InterviewService;
import iuh.fit.se.interview.security.CurrentUser;
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
    private final ApplicationServiceClient applicationServiceClient;
    private final InterviewRepository interviewRepository;
    private final InterviewService interviewService;

    @Transactional
    public SalaryProposalResponse submit(CurrentUser actor, SalaryProposalRequest req) {
        if (req.interviewId() == null) {
            requireApplicationAccess(req.applicationId());
        } else {
            Interview interview = interviewRepository.findById(req.interviewId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));
            if (!req.applicationId().equals(interview.getApplicationId())) {
                throw new BusinessException("Buổi phỏng vấn không thuộc hồ sơ ứng tuyển");
            }
            interviewService.requireCanView(interview, actor);
        }
        String proposedByName = "Phòng ban";
        try {
            List<UserSummaryResponse> users = authServiceClient.getUsers(null);
            if (users != null) {
                proposedByName = users.stream()
                        .filter(u -> u.id().equals(actor.userId()))
                        .map(UserSummaryResponse::fullName)
                        .findFirst()
                        .orElse("Phòng ban");
            }
        } catch (Exception ignored) {
        }

        SalaryProposal proposal = SalaryProposal.builder()
                .applicationId(req.applicationId())
                .interviewId(req.interviewId())
                .proposedSalary(req.proposedSalary())
                .comment(req.comment())
                .proposedById(actor.userId())
                .proposedByName(proposedByName)
                .status(SalaryProposalStatus.PENDING)
                .build();

        SalaryProposal saved = repository.save(proposal);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SalaryProposalResponse> getByApplicationId(Long applicationId) {
        requireApplicationAccess(applicationId);
        return repository.findByApplicationIdOrderByCreatedAtDesc(applicationId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SalaryProposalResponse approve(Long actorUserId, String role, Long id) {
        AccessGuard.requireHr(role);

        SalaryProposal proposal = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đề xuất lương"));
        requireApplicationAccess(proposal.getApplicationId());

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

    private void requireApplicationAccess(Long applicationId) {
        try {
            applicationServiceClient.getApplicationById(applicationId);
        } catch (Exception exception) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển hoặc bạn không có quyền truy cập");
        }
    }
}
