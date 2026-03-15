package com.bomcare.api.document.dto;

import java.util.List;

public record DocumentCenterResponse(
        List<TemplateItem> templates,
        List<IntegrationItem> integrations
) {
    public record TemplateItem(String name, String type, String description) {}

    public record IntegrationItem(String name, String state, String description) {}
}
