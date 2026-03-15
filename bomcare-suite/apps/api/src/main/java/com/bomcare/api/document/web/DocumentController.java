package com.bomcare.api.document.web;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bomcare.api.document.dto.DocumentCenterResponse;
import com.bomcare.api.document.dto.JournalAiDraftRequest;
import com.bomcare.api.document.dto.JournalAiDraftResponse;
import com.bomcare.api.document.dto.JournalHwpRequest;
import com.bomcare.api.document.service.JournalAiDraftService;
import com.bomcare.api.document.service.JournalDocumentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/documents")
@Validated
public class DocumentController {
    private final JournalDocumentService journalDocumentService;
    private final JournalAiDraftService journalAiDraftService;

    public DocumentController(
            JournalDocumentService journalDocumentService,
            JournalAiDraftService journalAiDraftService
    ) {
        this.journalDocumentService = journalDocumentService;
        this.journalAiDraftService = journalAiDraftService;
    }

    @GetMapping("/center")
    public ResponseEntity<DocumentCenterResponse> center() {
        return ResponseEntity.ok(new DocumentCenterResponse(
                List.of(
                        new DocumentCenterResponse.TemplateItem("아동 사례관리 보고서", "HWP", "기관 제출용 표준 양식"),
                        new DocumentCenterResponse.TemplateItem("생활기록 주간 점검표", "XLSX", "상담과 생활 데이터를 한 번에 정리"),
                        new DocumentCenterResponse.TemplateItem("보조금 집행 현황", "XLSX", "행정 제출 전 검토용")
                ),
                List.of(
                        new DocumentCenterResponse.IntegrationItem("HWP template engine", "Planned", "기관 문서 자동 생성"),
                        new DocumentCenterResponse.IntegrationItem("Spreadsheet exchange", "Ready", "업로드와 다운로드 중심 연동"),
                        new DocumentCenterResponse.IntegrationItem("Approval workflow", "Planned", "관리자 승인과 이력 추적")
                )
        ));
    }

    @PostMapping("/journal/ai-draft")
    public ResponseEntity<JournalAiDraftResponse> createJournalDraft(@Valid @RequestBody JournalAiDraftRequest request) {
        return ResponseEntity.ok(journalAiDraftService.createDraft(request));
    }

    @PostMapping(value = "/journal/hwp", produces = "application/x-hwp")
    public ResponseEntity<byte[]> createJournalHwp(@Valid @RequestBody JournalHwpRequest request) {
        byte[] payload = journalDocumentService.createJournalDocument(request);
        String filename = "journal-" + request.journalDate().replaceAll("[^0-9-]", "") + ".hwp";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + filename)
                .contentType(new MediaType("application", "x-hwp", StandardCharsets.UTF_8))
                .contentLength(payload.length)
                .body(payload);
    }
}
