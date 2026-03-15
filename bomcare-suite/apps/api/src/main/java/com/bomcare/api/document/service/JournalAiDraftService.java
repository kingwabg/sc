package com.bomcare.api.document.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.bomcare.api.document.dto.JournalAiDraftRequest;
import com.bomcare.api.document.dto.JournalAiDraftResponse;
import com.bomcare.api.document.dto.JournalHwpRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class JournalAiDraftService {
    private static final String RESPONSE_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["reply", "title", "highlights", "sections", "tableHeaders", "tableRows", "notes"],
              "properties": {
                "reply": { "type": "string" },
                "title": { "type": "string" },
                "highlights": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "sections": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["heading", "content"],
                    "properties": {
                      "heading": { "type": "string" },
                      "content": { "type": "string" }
                    }
                  }
                },
                "tableHeaders": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "tableRows": {
                  "type": "array",
                  "items": {
                    "type": "array",
                    "items": { "type": "string" }
                  }
                },
                "notes": { "type": "string" }
              }
            }
            """;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public JournalAiDraftService(
            ObjectMapper objectMapper,
            @Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${OPENAI_DOCUMENT_MODEL:gpt-4.1-mini}") String model
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.apiKey = apiKey;
        this.model = model;
    }

    public JournalAiDraftResponse createDraft(JournalAiDraftRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            return fallbackResponse(request);
        }

        try {
            return openAiResponse(request);
        } catch (Exception exception) {
            return fallbackResponse(request);
        }
    }

    private JournalAiDraftResponse openAiResponse(JournalAiDraftRequest request) throws IOException, InterruptedException {
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(buildRequestBody(request))))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("OpenAI 호출 실패: " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String outputText = extractOutputText(root);
        DraftPayload payload = objectMapper.readValue(outputText, DraftPayload.class);
        return new JournalAiDraftResponse(payload.reply(), "openai", toJournalRequest(request, payload));
    }

    private Map<String, Object> buildRequestBody(JournalAiDraftRequest request) throws IOException {
        Map<String, Object> format = new LinkedHashMap<>();
        format.put("type", "json_schema");
        format.put("name", "journal_draft");
        format.put("strict", true);
        format.put("schema", objectMapper.readValue(RESPONSE_SCHEMA, Map.class));

        Map<String, Object> text = Map.of("format", format);

        Map<String, Object> systemMessage = Map.of(
                "role", "system",
                "content", List.of(Map.of(
                        "type", "input_text",
                        "text", "You generate Korean child-welfare facility operation journal drafts. Keep the tone administrative and concise. Return only the requested schema."
                ))
        );

        Map<String, Object> userMessage = Map.of(
                "role", "user",
                "content", List.of(Map.of(
                        "type", "input_text",
                        "text", objectMapper.writeValueAsString(request)
                ))
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("input", List.of(systemMessage, userMessage));
        body.put("text", text);
        return body;
    }

    private String extractOutputText(JsonNode root) {
        JsonNode outputText = root.get("output_text");
        if (outputText != null && outputText.isTextual() && StringUtils.hasText(outputText.asText())) {
            return outputText.asText();
        }

        JsonNode outputs = root.get("output");
        if (outputs == null || !outputs.isArray()) {
            throw new IllegalStateException("OpenAI 응답에 output_text가 없습니다.");
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode output : outputs) {
            JsonNode content = output.get("content");
            if (content == null || !content.isArray()) {
                continue;
            }

            for (JsonNode item : content) {
                JsonNode text = item.get("text");
                if (text != null && text.isTextual()) {
                    builder.append(text.asText());
                }
            }
        }

        if (!StringUtils.hasText(builder.toString())) {
            throw new IllegalStateException("OpenAI 응답에서 텍스트를 추출하지 못했습니다.");
        }

        return builder.toString();
    }

    private JournalAiDraftResponse fallbackResponse(JournalAiDraftRequest request) {
        String title = StringUtils.hasText(request.programName())
                ? request.programName().trim() + " 운영일지"
                : "아동 운영일지";

        JournalHwpRequest draft = new JournalHwpRequest(
                title,
                request.author(),
                request.facilityName(),
                request.journalDate(),
                request.startTime(),
                request.endTime(),
                request.programName(),
                List.of(
                        request.facilityName() + " 운영 내용을 기준으로 초안을 만들었습니다.",
                        "프롬프트 반영: " + request.prompt().trim()
                ),
                List.of(
                        new JournalHwpRequest.JournalSection("진행 개요", request.prompt().trim()),
                        new JournalHwpRequest.JournalSection("아동 지원 내용", "프로그램 운영, 생활지도, 상담 내용을 행정 문서 톤으로 정리합니다."),
                        new JournalHwpRequest.JournalSection("특이 사항", "안전, 건강, 출결과 관련한 변동 사항을 확인합니다.")
                ),
                List.of("시간", "구분", "내용", "담당자"),
                List.of(
                        List.of(safeTime(request), "운영 준비", "일정과 환경 점검을 진행했습니다.", request.author()),
                        List.of(safeTime(request), "프로그램", "아동 활동 및 관찰 내용을 기록합니다.", request.author()),
                        List.of(safeTime(request), "마감", "보호자 공유 및 내부 기록을 정리합니다.", request.author())
                ),
                "AI 키가 없어서 규칙 기반 초안을 반환했습니다."
        );

        return new JournalAiDraftResponse(
                "운영일지 초안을 만들었습니다. 시설명, 날짜, 담당자와 함께 HWP 생성 API로 바로 넘길 수 있습니다.",
                "fallback",
                draft
        );
    }

    private String safeTime(JournalAiDraftRequest request) {
        if (StringUtils.hasText(request.startTime()) && StringUtils.hasText(request.endTime())) {
            return request.startTime().trim() + " ~ " + request.endTime().trim();
        }
        return "09:00 ~ 18:00";
    }

    private JournalHwpRequest toJournalRequest(JournalAiDraftRequest request, DraftPayload payload) {
        List<JournalHwpRequest.JournalSection> sections = payload.sections().stream()
                .map(section -> new JournalHwpRequest.JournalSection(section.heading(), section.content()))
                .toList();

        return new JournalHwpRequest(
                payload.title(),
                request.author(),
                request.facilityName(),
                request.journalDate(),
                request.startTime(),
                request.endTime(),
                request.programName(),
                payload.highlights(),
                sections,
                payload.tableHeaders(),
                payload.tableRows(),
                payload.notes()
        );
    }

    private record DraftPayload(
            String reply,
            String title,
            List<String> highlights,
            List<DraftSection> sections,
            List<String> tableHeaders,
            List<List<String>> tableRows,
            String notes
    ) {
    }

    private record DraftSection(
            String heading,
            String content
    ) {
    }
}
