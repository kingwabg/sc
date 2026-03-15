package com.bomcare.api.document.dto;

import jakarta.validation.constraints.NotBlank;

public record JournalAiDraftRequest(
        @NotBlank String prompt,
        @NotBlank String author,
        @NotBlank String facilityName,
        @NotBlank String journalDate,
        String startTime,
        String endTime,
        String programName,
        String recordType,
        String target,
        String tags,
        String currentBody
) {
}
