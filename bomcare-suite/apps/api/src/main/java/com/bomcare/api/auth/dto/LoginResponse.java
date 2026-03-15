package com.bomcare.api.auth.dto;

import java.util.List;

public record LoginResponse(
        String displayName,
        String role,
        String facilityName,
        List<String> permissions,
        String accessToken
) {
}
