package com.bomcare.api.document.dto;

public record JournalAiStatusResponse(
        boolean openAiConfigured,
        String model
) {
}
