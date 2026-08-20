package iuh.fit.se.candidate.customfield.dto;

import iuh.fit.se.candidate.customfield.CustomFieldType;

public record CustomFieldDefinitionResponse(
        Long id,
        String fieldKey,
        String fieldLabel,
        CustomFieldType fieldType,
        boolean active
) {}
