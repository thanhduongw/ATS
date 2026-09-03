package iuh.fit.se.candidate.event;

import iuh.fit.se.candidate.candidate.CandidateService;
import iuh.fit.se.candidate.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CandidateRegistrationListener {

    private final CandidateService candidateService;

    @RabbitListener(queues = RabbitMQConfig.CANDIDATE_REGISTERED_QUEUE)
    public void handle(CandidateRegisteredEvent event) {
        candidateService.provisionRegisteredCandidate(event);
    }
}
