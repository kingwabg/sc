package com.bomcare.api.document.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

import com.bomcare.api.document.dto.JournalAiDraftRequest;
import com.bomcare.api.document.dto.JournalAiDraftResponse;
import tools.jackson.databind.ObjectMapper;

class JournalAiDraftServiceTest {

    @Test
    void returnsFallbackDraftWhenApiKeyIsMissing() {
        JournalAiDraftService service = new JournalAiDraftService(new ObjectMapper(), "", "gpt-4.1-mini");

        JournalAiDraftResponse response = service.createDraft(new JournalAiDraftRequest(
                "오늘 운영일지 초안 만들어줘",
                "최하은",
                "새봄 아동센터",
                "2026-03-16",
                "09:00",
                "18:00",
                "생활지원"
        ));

        assertEquals("fallback", response.mode());
        assertFalse(response.draft().tableHeaders().isEmpty());
    }
}
