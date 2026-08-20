package iuh.fit.se.application.application.dto;

import java.util.List;
import java.util.Map;

public record BulkOperationResponse(
        List<Long> succeededIds,
        Map<Long, String> failedIds
) {}
