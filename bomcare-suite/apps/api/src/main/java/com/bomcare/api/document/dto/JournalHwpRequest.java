package com.bomcare.api.document.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public record JournalHwpRequest(
        @NotBlank String title,
        @NotBlank String author,
        @NotBlank String facilityName,
        @NotBlank String journalDate,
        String startTime,
        String endTime,
        String programName,
        List<String> highlights,
        @Valid List<JournalSection> sections,
        List<String> tableHeaders,
        List<List<String>> tableRows,
        String notes
) {
    public JournalHwpRequest {
        highlights = highlights == null ? List.of() : List.copyOf(highlights);
        sections = sections == null ? List.of() : List.copyOf(sections);
        tableHeaders = tableHeaders == null ? List.of() : List.copyOf(tableHeaders);
        tableRows = tableRows == null ? List.of() : tableRows.stream().map(List::copyOf).toList();
    }

    public record JournalSection(
            @NotBlank String heading,
            @NotBlank String content
    ) {
    }
}
