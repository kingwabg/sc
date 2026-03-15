package com.bomcare.api.auth.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bomcare.api.auth.dto.LoginRequest;
import com.bomcare.api.auth.dto.LoginResponse;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Validated @RequestBody LoginRequest request) {
        LoginResponse response = new LoginResponse(
                "한지수",
                "ADMIN",
                "서울 새봄 아동센터",
                List.of("dashboard:read", "facility:read", "documents:write"),
                "demo-token-for-local-build"
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<LoginResponse> bootstrap() {
        return ResponseEntity.ok(new LoginResponse(
                "한지수",
                "ADMIN",
                "서울 새봄 아동센터",
                List.of("dashboard:read", "facility:read", "documents:write"),
                "demo-token-for-local-build"
        ));
    }
}
