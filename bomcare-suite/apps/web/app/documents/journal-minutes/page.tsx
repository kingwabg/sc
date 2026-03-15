"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentAiPanel } from "../../../components/document-ai-panel";
import { Shell } from "../../../components/shell";
import { appendAuditLog } from "../../../lib/audit-log";
import {
  type JournalAiDraftResponsePayload,
  type JournalHwpPayload,
  getJournalApiBaseUrlLabel,
  requestJournalAiDraft,
  requestJournalAiStatus,
  requestJournalHwp
} from "../../../lib/journal-document-api";
import {
  getJournalMinutes,
  JournalMinutesEntry,
  JournalType,
  removeJournalMinutes,
  upsertJournalMinutes
} from "../../../lib/journal-minutes-store";

type EditorForm = {
  id?: number;
  facilityName: string;
  workDate: string;
  title: string;
  manager: string;
  target: string;
  program: string;
  category: string;
  recordType: JournalType;
  startTime: string;
  endTime: string;
  tags: string;
  body: string;
};

const defaultForm: EditorForm = {
  facilityName: "새봄 아동센터",
  workDate: "2026-03-12",
  title: "3월 12일 목 운영일지",
  manager: "최하은",
  target: "아동 전체",
  program: "집계 기준",
  category: "일지",
  recordType: "운영일지(아동)",
  startTime: "09:00",
  endTime: "18:00",
  tags: "일상, 상담",
  body: "<p>운영일지 본문을 입력하세요.</p>"
};

type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const journalAssistantPrompts = [
  "오늘 운영일지 초안 만들어줘",
  "아동 현황과 특이사항 중심으로 써줘",
  "시간대별 활동 표까지 넣어줘",
  "회의록 형식으로 바꿔줘",
  "행정 문체로 간결하게 다듬어줘"
] as const;

const DEFAULT_MYBOX_HOME_URL = "https://mybox.naver.com/";
const DEFAULT_MYBOX_WEBHWP_URL = "https://webhwp.mybox.naver.com/webhwp/?mode=HWP_EDITOR&lang=ko_KR";
const DEFAULT_POLARIS_HWP_EDITOR_URL =
  "https://www.polarisoffice.com/editor/po/hwp?docPopup=true&utm_source=pohomepage&utm_medium=productpage&utm_campaign=hp_edit_hwp";

const MYBOX_HOME_URL = process.env.NEXT_PUBLIC_MYBOX_HOME_URL?.trim() || DEFAULT_MYBOX_HOME_URL;
const MYBOX_WEBHWP_URL = process.env.NEXT_PUBLIC_MYBOX_WEBHWP_URL?.trim() || DEFAULT_MYBOX_WEBHWP_URL;
const POLARIS_HWP_EDITOR_URL =
  process.env.NEXT_PUBLIC_POLARIS_HWP_EDITOR_URL?.trim() || DEFAULT_POLARIS_HWP_EDITOR_URL;

function buildFileName(form: EditorForm, ext: "hwp" | "hwpx"): string {
  const prefix = form.recordType === "회의록" ? "회의록" : "운영일지";
  return `${prefix}_${form.workDate}_${form.manager}.${ext}`;
}

function stripHtml(html: string): string {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.textContent ?? "";
}

function makeHwpCompatibleHtml(form: EditorForm): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${form.title}</title>
<style>
body{font-family:'Malgun Gothic',sans-serif;padding:24px;line-height:1.6}
h1{font-size:26px;margin:0 0 16px}
table{border-collapse:collapse;width:100%;margin-bottom:16px}
td,th{border:1px solid #bbb;padding:8px}
.meta{font-size:14px;color:#333}
</style>
</head>
<body>
<h1>${form.recordType}</h1>
<table>
  <tr><th>일자</th><td>${form.workDate}</td><th>담당자</th><td>${form.manager}</td></tr>
  <tr><th>운영시간</th><td>${form.startTime} ~ ${form.endTime}</td><th>프로그램</th><td>${form.program}</td></tr>
  <tr><th>대상자</th><td>${form.target}</td><th>태그</th><td>${form.tags}</td></tr>
</table>
<div class="meta">제목: ${form.title}</div>
<div style="margin-top:12px">${form.body}</div>
</body>
</html>`;
}

function makeHwpxLikeXml(form: EditorForm): string {
  const bodyText = stripHtml(form.body).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<journalMinutes>
  <title>${form.title}</title>
  <recordType>${form.recordType}</recordType>
  <workDate>${form.workDate}</workDate>
  <manager>${form.manager}</manager>
  <target>${form.target}</target>
  <program>${form.program}</program>
  <startTime>${form.startTime}</startTime>
  <endTime>${form.endTime}</endTime>
  <tags>${form.tags}</tags>
  <body>${bodyText}</body>
</journalMinutes>`;
}

function downloadFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toForm(row: JournalMinutesEntry): EditorForm {
  return {
    id: row.id,
    facilityName: row.facilityName,
    workDate: row.workDate,
    title: row.title,
    manager: row.manager,
    target: row.target,
    program: row.program,
    category: row.category,
    recordType: row.recordType,
    startTime: row.startTime,
    endTime: row.endTime,
    tags: row.tags,
    body: row.body
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(fileName: string, blob: Blob): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function splitTags(tags: string): string[] {
  return tags
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractTableModel(html: string): { headers: string[]; rows: string[][] } {
  const box = document.createElement("div");
  box.innerHTML = html;
  const table = box.querySelector("table");
  if (!table) {
    return { headers: [], rows: [] };
  }

  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th,td"))
      .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  );

  const meaningfulRows = rows.filter((row) => row.length > 0);
  if (meaningfulRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const firstRow = meaningfulRows[0];
  const hasHeader = meaningfulRows[0].length > 0 && table.querySelector("th") !== null;

  return {
    headers: hasHeader ? firstRow : [],
    rows: hasHeader ? meaningfulRows.slice(1) : meaningfulRows
  };
}

function extractSections(html: string): { heading: string; content: string }[] {
  const box = document.createElement("div");
  box.innerHTML = html;

  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (!content) {
      currentHeading = "";
      currentLines = [];
      return;
    }

    sections.push({
      heading: currentHeading || "기록 내용",
      content
    });
    currentHeading = "";
    currentLines = [];
  };

  Array.from(box.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.tagName === "TABLE") {
      return;
    }

    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) {
      return;
    }

    const isHeadingNode = /^H[1-4]$/.test(node.tagName);
    const looksLikeHeading = /^\d+\.\s+/.test(text) || /현황|특이사항|조치|개요|회의/.test(text);

    if (isHeadingNode || (looksLikeHeading && text.length <= 32)) {
      flush();
      currentHeading = text.replace(/\s+/g, " ").trim();
      return;
    }

    currentLines.push(text);
  });

  flush();

  if (sections.length > 0) {
    return sections;
  }

  const plainText = stripHtml(html).replace(/\s+/g, " ").trim();
  if (!plainText) {
    return [{ heading: "기록 내용", content: "내용을 입력해 주세요." }];
  }

  return [{ heading: "기록 내용", content: plainText }];
}

function buildJournalPayload(form: EditorForm, body: string): JournalHwpPayload {
  const tableModel = extractTableModel(body);
  const sections = extractSections(body);
  const timeRange = `${form.startTime || "09:00"} ~ ${form.endTime || "18:00"}`;
  const summaryText = stripHtml(body).replace(/\s+/g, " ").trim();

  return {
    title: form.title,
    author: form.manager,
    facilityName: form.facilityName,
    journalDate: form.workDate,
    startTime: form.startTime,
    endTime: form.endTime,
    programName: form.program,
    highlights: splitTags(form.tags),
    sections,
    tableHeaders: tableModel.headers.length > 0 ? tableModel.headers : ["시간", "구분", "내용", "담당자"],
    tableRows:
      tableModel.rows.length > 0
        ? tableModel.rows
        : [[timeRange, form.recordType, summaryText || "기록 내용을 작성해 주세요.", form.manager]],
    notes: `기록물: ${form.recordType}${form.target ? ` / 대상자: ${form.target}` : ""}`
  };
}

function renderDraftHtml(draft: JournalHwpPayload): string {
  const highlightHtml =
    draft.highlights.length > 0
      ? `<p><strong>핵심 메모</strong>: ${draft.highlights.map(escapeHtml).join(", ")}</p>`
      : "";

  const sectionHtml = draft.sections
    .map(
      (section) =>
        `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.content).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

  const tableHtml =
    draft.tableHeaders.length > 0
      ? `
<table>
  <tr>${draft.tableHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
  ${draft.tableRows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}
</table>`
      : "";

  const noteHtml = draft.notes ? `<p><strong>비고</strong>: ${escapeHtml(draft.notes)}</p>` : "";

  return `${highlightHtml}${sectionHtml}${tableHtml}${noteHtml}`;
}

function createDailyTemplate(form: EditorForm): string {
  return `
<h2 style="text-align:center;margin:12px 0 20px;">${form.recordType}</h2>
<table>
  <tr>
    <th style="width:120px">일자</th><td>${form.workDate}</td>
    <th style="width:120px">운영시간</th><td>${form.startTime} ~ ${form.endTime}</td>
  </tr>
  <tr>
    <th>담당자</th><td>${form.manager}</td>
    <th>대상자</th><td>${form.target}</td>
  </tr>
  <tr>
    <th>프로그램</th><td colspan="3">${form.program}</td>
  </tr>
</table>
<p><strong>제목:</strong> ${form.title}</p>
<p><strong>태그:</strong> ${form.tags}</p>
<hr />
<p>1. 아동 현황</p>
<p>2. 급식 현황</p>
<p>3. 교사/종사자 현황</p>
<p>4. 특이사항 및 조치</p>
<hr />
<div style="display:flex;justify-content:flex-end;gap:20px;margin-top:20px;">
  <div style="text-align:center;border:1px solid #bbb;padding:10px 20px;">담당자<br/><br/>${form.manager}</div>
  <div style="text-align:center;border:1px solid #bbb;padding:10px 20px;">센터장<br/><br/>서명</div>
</div>
`;
}

export default function JournalMinutesPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<JournalMinutesEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EditorForm>(defaultForm);
  const [periodStart, setPeriodStart] = useState("2026-02-01");
  const [periodEnd, setPeriodEnd] = useState("2026-03-31");
  const [managerFilter, setManagerFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState<"ALL" | JournalType>("ALL");
  const [saveBusy, setSaveBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Spring Boot 문서 API 연결 대기");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMode, setAssistantMode] = useState<"openai" | "fallback">("fallback");
  const [assistantModel, setAssistantModel] = useState("gpt-4.1-mini");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: Date.now(),
      role: "assistant",
      content: "운영일지 초안, 회의록 정리, 시간대별 표 작성까지 도와드릴 수 있습니다."
    }
  ]);

  useEffect(() => {
    const initial = getJournalMinutes();
    setRows(initial);
    if (initial[0]) {
      setSelectedId(initial[0].id);
      setForm(toForm(initial[0]));
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== form.body) {
      editorRef.current.innerHTML = form.body;
    }
  }, [form.body, selectedId]);

  useEffect(() => {
    const loadAiStatus = async () => {
      try {
        const status = await requestJournalAiStatus();
        setAssistantModel(status.model || "gpt-4.1-mini");
        if (status.openAiConfigured) {
          setAssistantMode("openai");
          setStatusMessage(`문서 API 연결 완료 · OpenAI 활성화 (${status.model})`);
        } else {
          setAssistantMode("fallback");
          setStatusMessage("문서 API 연결 완료 · OpenAI 키 미설정(현재 fallback 모드)");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 상태 확인 실패";
        setAssistantMode("fallback");
        setStatusMessage(`문서 API 연결 확인 실패: ${message}`);
      }
    };

    void loadAiStatus();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (row.workDate < periodStart || row.workDate > periodEnd) return false;
      if (managerFilter && !row.manager.includes(managerFilter)) return false;
      if (titleFilter && !row.title.includes(titleFilter)) return false;
      if (recordFilter !== "ALL" && row.recordType !== recordFilter) return false;
      return true;
    });
  }, [rows, periodStart, periodEnd, managerFilter, titleFilter, recordFilter]);

  const updateField = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pushAssistantMessage = (role: AssistantMessage["role"], content: string) => {
    setAssistantMessages((prev) => [...prev, { id: Date.now() + prev.length, role, content }]);
  };

  const syncBodyFromEditor = () => {
    const html = editorRef.current?.innerHTML ?? "";
    setForm((prev) => ({ ...prev, body: html }));
    return html;
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncBodyFromEditor();
  };

  const insertTable = () => {
    exec(
      "insertHTML",
      `<table><tr><th>항목</th><th>내용</th></tr><tr><td>예시</td><td>내용 입력</td></tr></table><p></p>`
    );
  };

  const applyTemplate = () => {
    const html = createDailyTemplate(form);
    setForm((prev) => ({ ...prev, body: html }));
    setStatusMessage("운영일지 기본 템플릿을 적용했습니다.");
    appendAuditLog("일지회의록", `템플릿 적용: ${form.title}`);
  };

  const persistRow = (body: string, reason: string) => {
    const next = upsertJournalMinutes({
      ...form,
      body,
      hwpFileName: buildFileName(form, "hwp")
    });
    setRows(next);
    setSelectedId(form.id ?? next[0].id);
    if (!form.id) setForm((prev) => ({ ...prev, id: next[0].id }));
    appendAuditLog("일지회의록", `${reason}: ${form.title}`);
  };

  const saveOnly = () => {
    const body = syncBodyFromEditor();
    persistRow(body, "저장");
    setStatusMessage("문서를 목록에 저장했습니다.");
  };

  const saveAndGenerate = async () => {
    const body = syncBodyFromEditor();
    const payload = buildJournalPayload({ ...form, body }, body);

    try {
      setSaveBusy(true);
      const blob = await requestJournalHwp(payload);
      downloadBlob(buildFileName(form, "hwp"), blob);
      persistRow(body, "실제 HWP 생성");
      setStatusMessage("hwplib 기반 실제 HWP를 생성해 다운로드했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "문서 생성 중 알 수 없는 오류가 발생했습니다.";
      setStatusMessage(`실제 HWP 생성 실패: ${message}`);
    } finally {
      setSaveBusy(false);
    }
  };

  const downloadPreviewHwp = () => {
    const body = syncBodyFromEditor();
    const payload = { ...form, body };
    downloadFile(
      buildFileName(payload, "hwp"),
      makeHwpCompatibleHtml(payload),
      "application/x-hwp;charset=utf-8"
    );
    setStatusMessage("브라우저형 HWP 미리보기를 다운로드했습니다.");
    appendAuditLog("일지회의록", `브라우저형 HWP: ${form.title}`);
  };

  const downloadHwpx = () => {
    const body = syncBodyFromEditor();
    const payload = { ...form, body };
    downloadFile(
      buildFileName(payload, "hwpx"),
      makeHwpxLikeXml(payload),
      "application/xml;charset=utf-8"
    );
    setStatusMessage("HWPX 구조 파일을 내보냈습니다.");
    appendAuditLog("일지회의록", `HWPX 내보내기: ${form.title}`);
  };

  const applyAiDraft = (payload: JournalAiDraftResponsePayload) => {
    const draft = payload.draft;
    const html = renderDraftHtml(draft);

    setForm((prev) => ({
      ...prev,
      title: draft.title || prev.title,
      facilityName: draft.facilityName || prev.facilityName,
      workDate: draft.journalDate || prev.workDate,
      manager: draft.author || prev.manager,
      program: draft.programName || prev.program,
      tags: draft.highlights.join(", "),
      body: html
    }));

    setAssistantMode(payload.mode);
    setStatusMessage(
      payload.mode === "openai" ? "OpenAI 초안을 문서 본문에 적용했습니다." : "규칙 기반 초안을 문서 본문에 적용했습니다."
    );
  };

  const submitAssistantPrompt = async (seedPrompt?: string) => {
    const prompt = (seedPrompt ?? assistantPrompt).trim();
    if (!prompt) {
      setStatusMessage("AI에게 요청할 문장을 입력해 주세요.");
      return;
    }

    const body = syncBodyFromEditor();
    const enrichedPrompt = `${prompt}\n\n현재 본문 요약:\n${stripHtml(body).slice(0, 800)}`;

    pushAssistantMessage("user", prompt);
    setAssistantBusy(true);
    setAssistantPrompt("");

    try {
      const response = await requestJournalAiDraft({
        prompt: enrichedPrompt,
        author: form.manager,
        facilityName: form.facilityName,
        journalDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        programName: form.program,
        recordType: form.recordType,
        target: form.target,
        tags: form.tags,
        currentBody: stripHtml(body).slice(0, 2000)
      });

      applyAiDraft(response);
      pushAssistantMessage("assistant", response.reply);
      appendAuditLog("일지회의록", `AI 초안 생성: ${form.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 초안 생성 중 오류가 발생했습니다.";
      setAssistantMode("fallback");
      setStatusMessage(`AI 초안 생성 실패: ${message}`);
      pushAssistantMessage("assistant", `AI 초안 생성에 실패했습니다. ${message}`);
    } finally {
      setAssistantBusy(false);
    }
  };

  const openMyboxWebhwp = () => {
    window.open(MYBOX_WEBHWP_URL, "_blank", "noopener,noreferrer");
    appendAuditLog("일지회의록", `MYBOX WebHWP 열기: ${form.title}`);
  };

  const openMyboxHome = () => {
    window.open(MYBOX_HOME_URL, "_blank", "noopener,noreferrer");
    appendAuditLog("일지회의록", `MYBOX 홈 열기: ${form.title}`);
  };

  const openPolarisEditor = () => {
    window.open(POLARIS_HWP_EDITOR_URL, "_blank", "noopener,noreferrer");
    appendAuditLog("일지회의록", `Polaris 편집기 열기: ${form.title}`);
  };

  const selectRow = (row: JournalMinutesEntry) => {
    setSelectedId(row.id);
    setForm(toForm(row));
    setStatusMessage(`문서 #${row.id}를 불러왔습니다.`);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const target = rows.find((row) => row.id === selectedId);
    const next = removeJournalMinutes(selectedId);
    setRows(next);
    if (next[0]) {
      setSelectedId(next[0].id);
      setForm(toForm(next[0]));
    } else {
      setSelectedId(null);
      setForm(defaultForm);
    }
    if (target) appendAuditLog("일지회의록", `삭제: ${target.title}`);
  };

  const newForm = () => {
    setSelectedId(null);
    setForm({ ...defaultForm, workDate: new Date().toISOString().slice(0, 10) });
    setStatusMessage("새 문서 작성을 시작했습니다.");
  };

  return (
    <Shell active="documents">
      <section className="page-header">
        <div>
          <p className="eyebrow">일지회의록관리</p>
          <h2>운영일지/회의록 작성, HWP 생성, 목록 관리</h2>
          <p className="muted-copy">리치 편집기 툴바와 HWP/HWPX 내보내기를 포함한 실무형 화면입니다.</p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="action-strip">
          <label>기간 시작<input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></label>
          <label>기간 종료<input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
          <label>담당자<input value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} placeholder="담당자 검색" /></label>
          <label>제목<input value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} placeholder="제목 검색" /></label>
          <label>
            기록물
            <select value={recordFilter} onChange={(e) => setRecordFilter(e.target.value as "ALL" | JournalType)}>
              <option value="ALL">전체</option>
              <option value="운영일지(아동)">운영일지(아동)</option>
              <option value="회의록">회의록</option>
            </select>
          </label>
        </div>
        <div className="stack-item" style={{ marginTop: 12 }}>
          <strong>문서 API 상태</strong>
          <p>{statusMessage}</p>
          <p>연결 대상: {getJournalApiBaseUrlLabel()}</p>
        </div>
      </section>

      <section className="workspace-2col">
        <article className="panel">
          <div className="panel-head">
            <h3>운영일지 목록</h3>
            <span>총 {filteredRows.length}건</span>
          </div>
          <div className="action-strip">
            <button type="button" className="ghost-action" onClick={newForm}>신규</button>
            <button type="button" className="ghost-action" onClick={removeSelected}>삭제</button>
          </div>
          <div className="table-list">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="table-row"
                onClick={() => selectRow(row)}
                style={{ textAlign: "left", borderColor: selectedId === row.id ? "rgba(47, 127, 122, 0.45)" : undefined }}
              >
                <div>
                  <strong>{row.workDate} · {row.title}</strong>
                  <p>{row.facilityName} · {row.manager} · {row.recordType}</p>
                </div>
                <span>HWP</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>운영일지 정보</h3>
            <span>{form.id ? `문서 #${form.id}` : "신규 문서"}</span>
          </div>

          <form className="editor-form">
            <label>시설명<input value={form.facilityName} onChange={(e) => updateField("facilityName", e.target.value)} /></label>
            <label>분류<input value={form.category} onChange={(e) => updateField("category", e.target.value)} /></label>
            <label>
              기록물
              <select value={form.recordType} onChange={(e) => updateField("recordType", e.target.value as JournalType)}>
                <option value="운영일지(아동)">운영일지(아동)</option>
                <option value="회의록">회의록</option>
              </select>
            </label>
            <label>일자<input type="date" value={form.workDate} onChange={(e) => updateField("workDate", e.target.value)} /></label>
            <label>담당자<input value={form.manager} onChange={(e) => updateField("manager", e.target.value)} /></label>
            <label>제목<input value={form.title} onChange={(e) => updateField("title", e.target.value)} /></label>
            <label>태그<input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} /></label>
            <label>대상자<input value={form.target} onChange={(e) => updateField("target", e.target.value)} /></label>
            <label>프로그램<input value={form.program} onChange={(e) => updateField("program", e.target.value)} /></label>
            <div className="action-strip">
              <label>시작시간<input type="time" value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} /></label>
              <label>종료시간<input type="time" value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} /></label>
            </div>
          </form>

          <div className="rich-toolbar">
            <button type="button" className="ghost-action" onClick={() => exec("bold")}><strong>B</strong></button>
            <button type="button" className="ghost-action" onClick={() => exec("italic")}><em>I</em></button>
            <button type="button" className="ghost-action" onClick={() => exec("underline")}><u>U</u></button>
            <button type="button" className="ghost-action" onClick={() => exec("justifyLeft")}>좌</button>
            <button type="button" className="ghost-action" onClick={() => exec("justifyCenter")}>중</button>
            <button type="button" className="ghost-action" onClick={() => exec("justifyRight")}>우</button>
            <button type="button" className="ghost-action" onClick={() => exec("insertUnorderedList")}>글머리</button>
            <button type="button" className="ghost-action" onClick={insertTable}>표</button>
            <button type="button" className="ghost-action" onClick={applyTemplate}>운영일지 템플릿</button>
          </div>

          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={syncBodyFromEditor}
          />

          <div className="action-strip">
            <button type="button" className="primary-action" onClick={saveAndGenerate} disabled={saveBusy}>
              {saveBusy ? "실제 HWP 생성 중..." : "실제 HWP 생성 + 목록저장"}
            </button>
            <button type="button" className="ghost-action" onClick={saveOnly}>저장</button>
            <button type="button" className="ghost-action" onClick={downloadPreviewHwp}>브라우저형 HWP</button>
            <button type="button" className="ghost-action" onClick={downloadHwpx}>HWPX 내보내기</button>
            <button type="button" className="ghost-action" onClick={() => void submitAssistantPrompt()} disabled={assistantBusy}>
              {assistantBusy ? "AI 초안 생성 중..." : "AI 초안 생성"}
            </button>
            <button type="button" className="ghost-action" onClick={openMyboxHome}>MYBOX 홈 열기</button>
            <button type="button" className="ghost-action" onClick={openMyboxWebhwp}>MYBOX WebHWP 열기</button>
            <button type="button" className="ghost-action" onClick={openPolarisEditor}>Polaris 편집기 열기</button>
          </div>

          <div className="stack-item" style={{ marginTop: 14 }}>
            <strong>hwplib 실제 생성 흐름</strong>
            <p>1) AI 초안 생성 또는 본문 직접 작성</p>
            <p>2) 실제 HWP 생성 + 목록저장</p>
            <p>3) Spring Boot + hwplib가 바이너리 HWP를 내려줍니다.</p>
          </div>

          <div className="stack-item" style={{ marginTop: 14 }}>
            <strong>MYBOX 연동 사용 순서</strong>
            <p>1) 이 화면에서 HWPX 내보내기</p>
            <p>2) MYBOX 홈에서 파일 업로드</p>
            <p>3) MYBOX 내부에서 문서를 선택해 WebHWP로 열기</p>
            <p>직접 docId URL을 열면 권한/주소 검증으로 실패할 수 있습니다.</p>
          </div>

          <div className="stack-item" style={{ marginTop: 10 }}>
            <strong>Polaris 시험 연동</strong>
            <p>1) 이 화면에서 HWPX 내보내기</p>
            <p>2) Polaris 편집기 열기</p>
            <p>3) Polaris에서 파일 업로드 후 편집</p>
          </div>
        </article>
      </section>

      <DocumentAiPanel
        open={assistantOpen}
        busy={assistantBusy}
        modeLabel={assistantMode === "openai" ? `OpenAI (${assistantModel})` : "규칙 모드"}
        input={assistantPrompt}
        messages={assistantMessages}
        quickPrompts={journalAssistantPrompts}
        contextLabel={`${form.facilityName} · ${form.recordType} · ${form.workDate}`}
        onInputChange={setAssistantPrompt}
        onPromptSelect={(prompt) => {
          setAssistantPrompt(prompt);
          void submitAssistantPrompt(prompt);
        }}
        onSubmit={() => {
          void submitAssistantPrompt();
        }}
        onToggle={() => setAssistantOpen((prev) => !prev)}
      />
    </Shell>
  );
}
