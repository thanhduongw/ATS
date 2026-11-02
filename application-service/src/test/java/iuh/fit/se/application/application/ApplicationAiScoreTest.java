package iuh.fit.se.application.application;

import iuh.fit.se.application.event.AiScoringCompletedEvent;
import iuh.fit.se.application.exception.BusinessException;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Bản sao điểm AI trên hồ sơ: áp dụng sự kiện từ ai-service, lọc theo xếp loại và sắp theo điểm
 * (hồ sơ chưa có điểm luôn nằm cuối).
 */
@ExtendWith(MockitoExtension.class)
class ApplicationAiScoreTest {

    private static final LocalDateTime AT = LocalDateTime.of(2026, 10, 15, 3, 0, 0, 123_456_000);

    @Mock private ApplicationRepository applicationRepository;

    @InjectMocks private ApplicationService service;

    @Test
    void completedEventStoresScoreAndTier() {
        when(applicationRepository.updateAiCompleted(7L, new BigDecimal("75.0"), "FIT", AT)).thenReturn(1);

        assertTrue(service.applyAiScore(event("COMPLETED", new BigDecimal("75.0"), "FIT")));
    }

    @Test
    void unclassifiedWithoutScoreIsAccepted() {
        // Chưa phân loại vì không tính được điểm: ai-service gửi totalScore = null
        when(applicationRepository.updateAiCompleted(7L, null, "UNCLASSIFIED", AT)).thenReturn(1);

        assertTrue(service.applyAiScore(event("COMPLETED", null, "UNCLASSIFIED")));
        verify(applicationRepository).updateAiCompleted(7L, null, "UNCLASSIFIED", AT);
    }

    @Test
    void unclassifiedWithScoreIsAccepted() {
        when(applicationRepository.updateAiCompleted(7L, new BigDecimal("60.0"), "UNCLASSIFIED", AT)).thenReturn(1);

        assertTrue(service.applyAiScore(event("COMPLETED", new BigDecimal("60.0"), "UNCLASSIFIED")));
    }

    @Test
    void scoreIsRequiredForFitAndNotFit() {
        assertThrows(BusinessException.class, () -> service.applyAiScore(event("COMPLETED", null, "FIT")));
        assertThrows(BusinessException.class, () -> service.applyAiScore(event("COMPLETED", null, "NOT_FIT")));
        verifyNoInteractions(applicationRepository);
    }

    @Test
    void oldTiersAreRejected() {
        assertThrows(BusinessException.class,
                () -> service.applyAiScore(event("COMPLETED", new BigDecimal("75.0"), "GOOD_FIT")));
        assertThrows(BusinessException.class,
                () -> service.applyAiScore(event("COMPLETED", new BigDecimal("50.0"), "POTENTIAL_FIT")));
        assertThrows(BusinessException.class, () -> service.getAll(
                null, null, null, null, null, null, null, null, "GOOD_FIT", null, null, null));
        verifyNoInteractions(applicationRepository);
    }

    @Test
    void progressEventsOnlyChangeTheStatusSoTheOldScoreStaysVisibleWhileRescoring() {
        when(applicationRepository.updateAiStatus(7L, "PROCESSING", AT)).thenReturn(1);

        assertTrue(service.applyAiScore(event("PROCESSING", null, null)));
        verify(applicationRepository).updateAiStatus(7L, "PROCESSING", AT);
    }

    @Test
    void failedEventClearsTheScore() {
        when(applicationRepository.updateAiFailed(7L, AT)).thenReturn(1);

        assertTrue(service.applyAiScore(event("FAILED", null, null)));
    }

    @Test
    void staleOrUnknownApplicationReportsNoChange() {
        when(applicationRepository.updateAiFailed(7L, AT)).thenReturn(0);

        assertFalse(service.applyAiScore(event("FAILED", null, null)));
    }

    @Test
    void malformedEventsAreRejectedWithoutTouchingTheDatabase() {
        assertThrows(BusinessException.class, () -> service.applyAiScore(event("DONE", null, null)));
        assertThrows(BusinessException.class, () -> service.applyAiScore(event("COMPLETED", null, null)));
        assertThrows(BusinessException.class,
                () -> service.applyAiScore(event("COMPLETED", BigDecimal.TEN, "EXCELLENT")));
        assertThrows(BusinessException.class, () -> service.applyAiScore(
                new AiScoringCompletedEvent(7L, 5L, "FAILED", null, null, null)));
        verifyNoInteractions(applicationRepository);
    }

    @Test
    void eventPublishedByAiServiceDeserializesWithoutTypeHeader() {
        // Đúng định dạng ai-service phát (Python json.dumps, datetime.isoformat(), không có __TypeId__)
        String body = """
                {"applicationId": 7, "jobPostingId": 5, "status": "COMPLETED", "totalScore": 75.0,
                 "tier": "FIT", "updatedAt": "2026-10-15T03:00:00.123456"}""";
        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        props.setInferredArgumentType(AiScoringCompletedEvent.class);

        Object converted = new Jackson2JsonMessageConverter()
                .fromMessage(new Message(body.getBytes(StandardCharsets.UTF_8), props));

        assertEquals(event("COMPLETED", new BigDecimal("75.0"), "FIT"), converted);
    }

    @Test
    void unclassifiedEventWithNullScoreDeserializes() {
        String body = """
                {"applicationId": 7, "jobPostingId": 5, "status": "COMPLETED", "totalScore": null,
                 "tier": "UNCLASSIFIED", "updatedAt": "2026-10-15T03:00:00.123456"}""";
        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        props.setInferredArgumentType(AiScoringCompletedEvent.class);

        Object converted = new Jackson2JsonMessageConverter()
                .fromMessage(new Message(body.getBytes(StandardCharsets.UTF_8), props));

        assertEquals(event("COMPLETED", null, "UNCLASSIFIED"), converted);
    }

    @Test
    void sortingByAiScoreKeepsUnscoredApplicationsLastInBothDirections() {
        Application a = scored(1L, "62.5"), b = scored(2L, null), c = scored(3L, "88.0"), d = scored(4L, "62.5");
        List<Application> list = new ArrayList<>(List.of(a, b, c, d));

        list.sort(ApplicationService.listOrder("aiScore,desc"));
        assertEquals(List.of(3L, 1L, 4L, 2L), ids(list)); // cùng điểm: giữ thứ tự ban đầu

        list = new ArrayList<>(List.of(a, b, c, d));
        list.sort(ApplicationService.listOrder("aiScore,asc"));
        assertEquals(List.of(1L, 4L, 3L, 2L), ids(list));
    }

    @Test
    void unclassifiedWithoutScoreIsSortedLast() {
        // Hồ sơ Chưa phân loại không có điểm nằm cuối như hồ sơ chưa chấm, ở cả hai chiều
        Application unclassified = scored(1L, null), high = scored(2L, "80.0"), low = scored(3L, "40.0");
        unclassified.setAiTier("UNCLASSIFIED");

        List<Application> list = new ArrayList<>(List.of(unclassified, high, low));
        list.sort(ApplicationService.listOrder("aiScore,desc"));
        assertEquals(List.of(2L, 3L, 1L), ids(list));

        list = new ArrayList<>(List.of(unclassified, high, low));
        list.sort(ApplicationService.listOrder("aiScore,asc"));
        assertEquals(List.of(3L, 2L, 1L), ids(list));
    }

    @Test
    void defaultOrderIsLeftToTheQueryAndUnknownSortIsRejected() {
        assertNull(ApplicationService.listOrder(null));
        assertNull(ApplicationService.listOrder("appliedAt,desc"));
        assertThrows(BusinessException.class, () -> ApplicationService.listOrder("candidateName,asc"));
    }

    @Test
    void invalidTierFilterIsRejected() {
        assertThrows(BusinessException.class, () -> service.getAll(
                null, null, null, null, null, null, null, null, "EXCELLENT", null, null, null));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void tierFilterBecomesAQueryPredicate() {
        Root<Application> root = mock(Root.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> tierPath = mock(Path.class);
        when(root.get(any(String.class))).thenReturn((Path) mock(Path.class));
        when(root.get("aiTier")).thenReturn((Path) tierPath);
        when(cb.and(any(Predicate[].class))).thenReturn(mock(Predicate.class));

        ApplicationSpecifications.build(5L, null, null, null, null, "UNCLASSIFIED", null, null, null, null, false)
                .toPredicate(root, mock(CriteriaQuery.class), cb);

        verify(cb).equal(tierPath, "UNCLASSIFIED");
    }

    private static AiScoringCompletedEvent event(String status, BigDecimal score, String tier) {
        return new AiScoringCompletedEvent(7L, 5L, status, score, tier, AT);
    }

    private static Application scored(Long id, String score) {
        Application application = new Application();
        application.setId(id);
        application.setAiScore(score == null ? null : new BigDecimal(score));
        return application;
    }

    private static List<Long> ids(List<Application> applications) {
        return applications.stream().map(Application::getId).toList();
    }
}
