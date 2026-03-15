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
    private static final List<String> DEFAULT_HEADERS = List.of("시간", "구분", "내용", "담당자");
    private static final List<String> MEETING_HEADERS = List.of("순번", "안건", "논의 내용", "결정 사항", "담당/기한");

    private static final String RESPONSE_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["reply", "title", "highlights", "sections", "tableHeaders", "tableRows", "notes"],
              "properties": {
                "reply": { "type": "string" },
                "title": { "type": "string" },
                "highlights": { "type": "array", "items": { "type": "string" } },
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
                "tableHeaders": { "type": "array", "items": { "type": "string" } },
                "tableRows": {
                  "type": "array",
                  "items": { "type": "array", "items": { "type": "string" } }
                },
                "notes": { "type": "string" }
              }
            }
            """;

    private static final String SYSTEM_PROMPT = """
            You are an assistant that drafts Korean operational records for child welfare facilities.
            Output must be valid JSON that matches the provided schema exactly.
            Rules:
            1) Use concise administrative Korean style.
            2) Do not invent names, organizations, numbers, or sensitive facts not in input.
            3) title must look like an actual official document title.
            4) highlights must be 3-6 short keywords.
            5) sections must have at least 3 items.
            6) tableRows must have at least 3 rows.
            7) notes should include review/approval/privacy reminders in 1-2 sentences.
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
        if (!isOpenAiConfigured()) {
            return fallbackResponse(request);
        }

        try {
            return openAiResponse(request);
        } catch (Exception exception) {
            return fallbackResponse(request);
        }
    }

    public boolean isOpenAiConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public String modelName() {
        return model;
    }

    private JournalAiDraftResponse openAiResponse(JournalAiDraftRequest request) throws IOException, InterruptedException {
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(buildRequestBody(request))))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("OpenAI response failed: " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String outputText = extractOutputText(root);
        DraftPayload payload = objectMapper.readValue(outputText, DraftPayload.class);
        JournalHwpRequest draft = normalizeJournalRequest(request, payload);
        return new JournalAiDraftResponse(payload.reply(), "openai", draft);
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
                "content", List.of(Map.of("type", "input_text", "text", SYSTEM_PROMPT))
        );

        Map<String, Object> userMessage = Map.of(
                "role", "user",
                "content", List.of(Map.of("type", "input_text", "text", buildUserPrompt(request)))
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("input", List.of(systemMessage, userMessage));
        body.put("text", text);
        return body;
    }

    private String buildUserPrompt(JournalAiDraftRequest request) throws IOException {
        boolean meeting = isMeetingRecord(request.recordType());
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("author", request.author());
        context.put("facilityName", request.facilityName());
        context.put("journalDate", request.journalDate());
        context.put("startTime", blankToDefault(request.startTime(), "09:00"));
        context.put("endTime", blankToDefault(request.endTime(), "18:00"));
        context.put("programName", blankToDefault(request.programName(), "프로그램 미지정"));
        context.put("recordType", blankToDefault(request.recordType(), "운영일지(아동)"));
        context.put("target", blankToDefault(request.target(), "대상자 미지정"));
        context.put("tags", blankToDefault(request.tags(), "일상"));
        context.put("prompt", request.prompt());
        context.put("currentBody", blankToDefault(request.currentBody(), "(본문 없음)"));
        context.put("templateType", meeting ? "meeting_minutes" : "daily_journal");
        context.put("templateRules", meeting ? meetingTemplateRules() : dailyTemplateRules());
        context.put("preferredTableHeaders", meeting ? MEETING_HEADERS : DEFAULT_HEADERS);

        return "Generate the document draft based on this context JSON.\n" + objectMapper.writeValueAsString(context);
    }

    private String extractOutputText(JsonNode root) {
        JsonNode outputText = root.get("output_text");
        if (outputText != null && outputText.isTextual() && StringUtils.hasText(outputText.asText())) {
            return outputText.asText();
        }

        JsonNode outputs = root.get("output");
        if (outputs == null || !outputs.isArray()) {
            throw new IllegalStateException("OpenAI response does not include output_text.");
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
            throw new IllegalStateException("No usable text found in OpenAI response.");
        }

        return builder.toString();
    }

    private JournalAiDraftResponse fallbackResponse(JournalAiDraftRequest request) {
        String safeTitle = defaultTitle(request);

        JournalHwpRequest draft = new JournalHwpRequest(
                safeTitle,
                request.author(),
                request.facilityName(),
                request.journalDate(),
                request.startTime(),
                request.endTime(),
                request.programName(),
                List.of(
                        request.facilityName() + " 운영 기본 템플릿 기반 초안입니다.",
                        "요청 반영: " + request.prompt().trim()
                ),
                List.of(
                        new JournalHwpRequest.JournalSection("진행 개요", request.prompt().trim()),
                        new JournalHwpRequest.JournalSection("아동 지원 내용", "프로그램 운영, 생활지도, 상담 내용을 행정 형식으로 정리합니다."),
                        new JournalHwpRequest.JournalSection("특이 사항", "안전, 건강, 출결 관련 변경 사항을 확인합니다.")
                ),
                DEFAULT_HEADERS,
                List.of(
                        List.of(safeTime(request), "운영 준비", "일정과 환경 점검을 진행했습니다.", request.author()),
                        List.of(safeTime(request), "프로그램", "아동 참여와 관찰 내용을 기록했습니다.", request.author()),
                        List.of(safeTime(request), "마감", "보호자 공유 및 내부 기록을 정리했습니다.", request.author())
                ),
                "AI 키 미설정으로 규칙 기반 초안을 반환했습니다."
        );

        return new JournalAiDraftResponse(
                "운영일지 초안을 만들었습니다. 검토 후 바로 HWP 생성 API로 저장할 수 있습니다.",
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

    private JournalHwpRequest normalizeJournalRequest(JournalAiDraftRequest request, DraftPayload payload) {
        List<JournalHwpRequest.JournalSection> sections = normalizeSections(payload.sections(), request.recordType());
        List<String> headers = normalizeHeaders(payload.tableHeaders(), request.recordType());
        List<List<String>> rows = normalizeRows(payload.tableRows(), headers, request.author());
        List<String> highlights = normalizeHighlights(payload.highlights());
        String title = blankToDefault(payload.title(), defaultTitle(request));
        String notes = blankToDefault(payload.notes(), "기안 검토 후 결재 라인에 상신하세요.");

        return new JournalHwpRequest(
                title,
                request.author(),
                request.facilityName(),
                request.journalDate(),
                request.startTime(),
                request.endTime(),
                request.programName(),
                highlights,
                sections,
                headers,
                rows,
                notes
        );
    }

    private List<String> normalizeHighlights(List<String> highlights) {
        List<String> items = highlights == null ? List.of() : highlights.stream()
                .map(this::trimToNull)
                .filter(StringUtils::hasText)
                .limit(6)
                .toList();
        return items.isEmpty() ? List.of("운영일지", "아동지원", "일상기록") : items;
    }

    private List<JournalHwpRequest.JournalSection> normalizeSections(List<DraftSection> sections, String recordType) {
        List<JournalHwpRequest.JournalSection> mapped = sections == null ? List.of() : sections.stream()
                .map(section -> new JournalHwpRequest.JournalSection(
                        blankToDefault(section.heading(), "기록 내용"),
                        blankToDefault(section.content(), "세부 내용을 작성하세요.")
                ))
                .limit(6)
                .toList();

        if (mapped.size() >= 3) {
            return mapped;
        }

        if (isMeetingRecord(recordType)) {
            return List.of(
                    new JournalHwpRequest.JournalSection("회의 개요", "회의 일시, 참석 범위, 목적을 요약합니다."),
                    new JournalHwpRequest.JournalSection("안건별 논의 내용", "안건별 핵심 논의 사항과 주요 의견을 정리합니다."),
                    new JournalHwpRequest.JournalSection("결정 사항 및 후속 조치", "담당자와 기한을 포함해 실행 계획을 기록합니다.")
            );
        }

        return List.of(
                new JournalHwpRequest.JournalSection("진행 개요", "당일 운영 흐름과 주요 활동을 요약합니다."),
                new JournalHwpRequest.JournalSection("아동 지원 내용", "참여, 관찰, 상담 및 보호 조치를 기록합니다."),
                new JournalHwpRequest.JournalSection("특이 사항 및 후속조치", "안전/건강/출결 이슈와 후속 계획을 정리합니다.")
        );
    }

    private List<String> normalizeHeaders(List<String> headers, String recordType) {
        List<String> normalized = headers == null ? List.of() : headers.stream()
                .map(this::trimToNull)
                .filter(StringUtils::hasText)
                .limit(6)
                .toList();

        if (normalized.size() >= 3) {
            return normalized;
        }
        return isMeetingRecord(recordType) ? MEETING_HEADERS : DEFAULT_HEADERS;
    }

    private List<List<String>> normalizeRows(List<List<String>> rows, List<String> headers, String author) {
        int width = Math.max(3, headers.size());
        List<List<String>> normalized = rows == null ? List.of() : rows.stream()
                .map(row -> normalizeRow(row, width))
                .filter(row -> !row.isEmpty())
                .limit(10)
                .toList();

        if (normalized.size() >= 3) {
            return normalized;
        }

        if (width >= 5) {
            return List.of(
                    normalizeRow(List.of("1", "이전 회의 조치 점검", "완료/미완료 항목을 점검했습니다.", "미완료 항목 보완", blankToDefault(author, "담당자")), width),
                    normalizeRow(List.of("2", "아동 사례 공유", "고위험 신호 및 지원 현황을 공유했습니다.", "개별 상담 연계", blankToDefault(author, "담당자")), width),
                    normalizeRow(List.of("3", "다음 주 일정", "프로그램 운영 일정을 조정했습니다.", "일정 공지 및 준비", blankToDefault(author, "담당자")), width)
            );
        }

        return List.of(
                normalizeRow(List.of("09:00 ~ 10:00", "운영 준비", "출결 및 환경 점검", blankToDefault(author, "담당자")), width),
                normalizeRow(List.of("10:00 ~ 16:00", "프로그램", "활동 진행 및 관찰 기록", blankToDefault(author, "담당자")), width),
                normalizeRow(List.of("16:00 ~ 18:00", "마감", "보호자 공유 및 내부 보고 정리", blankToDefault(author, "담당자")), width)
        );
    }

    private List<String> normalizeRow(List<String> row, int width) {
        if (row == null || row.isEmpty()) {
            return List.of();
        }

        List<String> cleaned = row.stream()
                .map(cell -> blankToDefault(cell, "-"))
                .limit(width)
                .toList();

        if (cleaned.size() == width) {
            return cleaned;
        }

        LinkedHashMap<Integer, String> padded = new LinkedHashMap<>();
        for (int i = 0; i < width; i++) {
            padded.put(i, i < cleaned.size() ? cleaned.get(i) : "-");
        }
        return padded.values().stream().toList();
    }

    private String defaultTitle(JournalAiDraftRequest request) {
        String program = trimToNull(request.programName());
        if (isMeetingRecord(request.recordType())) {
            return StringUtils.hasText(program) ? program + " 회의록" : "아동 지원 회의록";
        }
        return StringUtils.hasText(program) ? program + " 운영일지" : "아동 운영일지";
    }

    private boolean isMeetingRecord(String recordType) {
        String value = trimToNull(recordType);
        return StringUtils.hasText(value) && value.contains("회의");
    }

    private String dailyTemplateRules() {
        return "Sections should focus on operation flow, child support content, and special notes. "
                + "Prefer time-based rows in the table.";
    }

    private String meetingTemplateRules() {
        return "Sections should focus on meeting overview, agenda discussions, and decisions/actions. "
                + "Table should emphasize agenda items, decisions, and owner/deadline.";
    }

    private String blankToDefault(String value, String defaultValue) {
        String normalized = trimToNull(value);
        return StringUtils.hasText(normalized) ? normalized : defaultValue;
    }

    private String trimToNull(String value) {
        return value == null ? null : value.trim();
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
