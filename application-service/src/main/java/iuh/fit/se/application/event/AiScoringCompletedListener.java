package iuh.fit.se.application.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.application.application.Application;
import iuh.fit.se.application.application.ApplicationRepository;
import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Listens for AI scoring results from ai-service and persists them
 * into the application table (ai_match_score, ai_classification, ai_scorecard).
 *
 * <p>Event payload (JSON published by ai-service cv_pipeline_worker.py):
 * <pre>{
 *   "applicationId": 4,
 *   "aiJobId": 7,
 *   "jobPostingId": 2,
 *   "totalScore": 19.0,
 *   "classification": "NOT_MATCH",
 *   "summary": "...",
 *   "scorecard": { ... }
 * }</pre>
 *
 * <p>Exceptions are logged and the message is acknowledged to avoid infinite requeue,
 * following the same pattern as {@link OfferOutcomeListener}.
 */
@Component
@RequiredArgsConstructor
public class AiScoringCompletedListener {

    private static final Logger log = LoggerFactory.getLogger(AiScoringCompletedListener.class);

    private final ApplicationRepository applicationRepository;
    private final ObjectMapper objectMapper;

    @org.springframework.transaction.annotation.Transactional
    @RabbitListener(queues = RabbitMQConfig.AI_SCORING_COMPLETED_QUEUE)
    public void onScoringCompleted(Message message) {
        try {
            JsonNode root = objectMapper.readTree(message.getBody());

            long applicationId = root.path("applicationId").asLong();
            long aiJobId = root.path("aiJobId").asLong();
            double totalScore = root.path("totalScore").asDouble();
            String classification = root.path("classification").asText();
            JsonNode scorecardNode = root.path("scorecard");

            Application app = applicationRepository.findById(applicationId).orElse(null);
            if (app == null) {
                log.warn("AI scoring received for unknown application_id={}", applicationId);
                return;
            }

            app.setAiMatchScore(BigDecimal.valueOf(totalScore));
            app.setAiClassification(classification);
            app.setAiJobId(aiJobId);

            // Store full scorecard as raw JSON string
            if (scorecardNode != null && !scorecardNode.isMissingNode()) {
                app.setAiScorecard(objectMapper.writeValueAsString(scorecardNode));
            }

            applicationRepository.save(app);

            log.info("AI scoring saved for application_id={}: score={}, classification={}",
                    applicationId, totalScore, classification);

        } catch (Exception e) {
            log.error("Failed to process AI scoring event: {}", e.getMessage(), e);
            // ACK the message to prevent infinite requeue — the data is not lost,
            // it remains in ai_jobs table and can be manually synced if needed.
        }
    }
}
