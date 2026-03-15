package com.bomcare.api.dashboard.dto;

import java.util.List;

public record DashboardSummaryResponse(
        List<KpiCard> kpis,
        List<AttentionItem> attentionItems,
        List<DocumentQueueItem> documentQueue
) {
    public record KpiCard(String title, String value, String trend, String tone) {}

    public record AttentionItem(String title, String detail, String severity) {}

    public record DocumentQueueItem(String title, String status, String dueLabel) {}
}
