package com.bomcare.api.document.dto;

public record JournalAiDraftResponse(
        String reply,
        String mode,
        JournalHwpRequest draft
) {
}
