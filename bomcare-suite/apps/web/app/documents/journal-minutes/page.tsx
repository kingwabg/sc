"use client";

import Link from "next/link";
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
  type ApprovalStatus,
  getJournalMinutes,
  type JournalMinutesEntry,
  type JournalType,
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
  approvalLine: string[];
  approvalStatus: ApprovalStatus;
};

type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const defaultForm: EditorForm = {
  facilityName: "늘봄 아동센터",
  workDate: "2026-03-16",
  title: "3월 16일 운영일지",
  manager: "관리자",
  target: "아동 전체",
  program: "생활지도",
  category: "일지",
  recordType: "운영일지(아동)",
  startTime: "09:00",
  endTime: "18:00",
  tags: "일상, 상담",
  body: "<p>운영일지 본문을 입력하세요.</p>",
  approvalLine: ["담당자", "팀장", "센터장"],
  approvalStatus: "draft"
};

const prompts = [
  "오늘 운영일지 초안 작성해줘",
  "회의록 형식으로 정리해줘",
  "특이사항 중심으로 간결하게 요약해줘",
  "표 형태로 활동 시간대 정리해줘"
] as const;

function approvalLabel(status: ApprovalStatus): string {
  if (status === "pending") return "결재대기";
  if (status === "approved") return "승인완료";
  if (status === "rejected") return "반려";
  return "임시저장";
}

function buildFileName(form: EditorForm, ext: "hwp" | "hwpx"): string {
  const prefix = form.recordType === "회의록" ? "회의록" : "운영일지";
  return `${prefix}_${form.workDate}_${form.manager}.${ext}`;
}

function stripHtml(html: string): string {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.textContent ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    body: row.body,
    approvalLine: row.approvalLine,
    approvalStatus: row.approvalStatus
  };
}

function splitTags(tags: string): string[] {
  return tags
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractTableModel(html: string): { headers: string[]; rows: string[][] } {
  const box = document.createElement("div");
  box.innerHTML = html;
  const table = box.querySelector("table");
  if (!table) return { headers: [], rows: [] };

  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th,td")).map((cell) => (cell.textContent ?? "").trim())
  );
  const first = rows[0] ?? [];
  const hasHeader = table.querySelector("th") !== null && first.length > 0;
  return {
    headers: hasHeader ? first : [],
    rows: hasHeader ? rows.slice(1) : rows
  };
}

function extractSections(html: string): { heading: string; content: string }[] {
  const text = stripHtml(html).replace(/\s+/g, " ").trim();
  if (!text) {
    return [{ heading: "기록 내용", content: "내용을 입력하세요." }];
  }
  return [
    { heading: "진행 개요", content: text.slice(0, 180) },
    { heading: "지원 내용", content: text.slice(180, 360) || text.slice(0, 120) },
    { heading: "특이 사항", content: "안전/건강/출결 관련 특이사항을 검토하세요." }
  ];
}

function renderDraftHtml(draft: JournalHwpPayload): string {
  const highlights =
    draft.highlights.length > 0 ? `<p><strong>핵심 키워드</strong>: ${draft.highlights.map(escapeHtml).join(", ")}</p>` : "";
  const sections = draft.sections
    .map((section) => `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.content).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const table =
    draft.tableHeaders.length > 0
      ? `<table><tr>${draft.tableHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>${draft.tableRows
          .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
          .join("")}</table>`
      : "";
  const notes = draft.notes ? `<p><strong>비고</strong>: ${escapeHtml(draft.notes)}</p>` : "";
  return `${highlights}${sections}${table}${notes}`;
}

function downloadText(name: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function JournalMinutesPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null);

  const [rows, setRows] = useState<JournalMinutesEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EditorForm>(defaultForm);
  const [statusMessage, setStatusMessage] = useState("문서 API 연결 상태를 확인 중입니다.");
  const [saveBusy, setSaveBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMode, setAssistantMode] = useState<"openai" | "fallback">("fallback");
  const [assistantModel, setAssistantModel] = useState("gpt-4.1-mini");
  const [approvalInput, setApprovalInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: Date.now(), role: "assistant", content: "일지/회의록 초안과 표 정리를 도와드릴게요." }
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
    const load = async () => {
      try {
        const status = await requestJournalAiStatus();
        setAssistantMode(status.openAiConfigured ? "openai" : "fallback");
        setAssistantModel(status.model || "gpt-4.1-mini");
        setStatusMessage(
          status.openAiConfigured
            ? `문서 API 연결 완료 · OpenAI 활성화 (${status.model})`
            : "문서 API 연결 완료 · OpenAI 미설정(fallback)"
        );
      } catch (error) {
        setStatusMessage(`문서 API 연결 실패: ${error instanceof Error ? error.message : "unknown"}`);
      }
    };
    void load();
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);

  const updateField = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const syncBody = () => {
    const html = editorRef.current?.innerHTML ?? "";
    setForm((prev) => ({ ...prev, body: html }));
    return html;
  };

  const clearCellSelection = () => {
    if (selectedCellRef.current) {
      selectedCellRef.current.classList.remove("hwp-table-selected-cell");
      selectedCellRef.current = null;
    }
  };

  const selectCellFromEvent = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell) return;
    clearCellSelection();
    selectedCellRef.current = cell;
    cell.classList.add("hwp-table-selected-cell");
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncBody();
  };

  const insertTable = () => {
    const headers =
      form.recordType === "회의록"
        ? ["순번", "안건", "논의", "결정", "담당/기한"]
        : ["시간", "구분", "내용", "담당자"];
    const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
    exec("insertHTML", `<table><tr>${headerHtml}</tr><tr>${headers.map(() => "<td>입력</td>").join("")}</tr></table><p></p>`);
  };

  const addRowBelow = () => {
    const cell = selectedCellRef.current;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    const table = row.closest("table");
    if (!table) return;
    const newRow = row.insertAdjacentElement("afterend", document.createElement("tr")) as HTMLTableRowElement | null;
    if (!newRow) return;
    for (let i = 0; i < row.cells.length; i += 1) {
      const newCell = document.createElement("td");
      newCell.textContent = "입력";
      newRow.appendChild(newCell);
    }
    syncBody();
  };

  const addColumnRight = () => {
    const cell = selectedCellRef.current;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = row?.closest("table");
    if (!table || !row) return;
    const index = Array.from(row.cells).indexOf(cell);
    Array.from(table.rows).forEach((r) => {
      const tag = r.querySelector("th") ? "th" : "td";
      const c = document.createElement(tag);
      c.textContent = tag === "th" ? "항목" : "입력";
      if (r.cells.length === 0 || index < 0 || index >= r.cells.length - 1) {
        r.appendChild(c);
      } else {
        r.insertBefore(c, r.cells[index + 1]);
      }
    });
    syncBody();
  };

  const deleteCurrentRow = () => {
    const cell = selectedCellRef.current;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = row?.closest("table");
    if (!row || !table) return;
    if (table.rows.length <= 1) return;
    row.remove();
    clearCellSelection();
    syncBody();
  };

  const deleteCurrentColumn = () => {
    const cell = selectedCellRef.current;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = row?.closest("table");
    if (!row || !table) return;
    const index = Array.from(row.cells).indexOf(cell);
    if (index < 0 || row.cells.length <= 1) return;
    Array.from(table.rows).forEach((r) => {
      if (index < r.cells.length) r.cells[index].remove();
    });
    clearCellSelection();
    syncBody();
  };

  const mergeWithRight = () => {
    const cell = selectedCellRef.current;
    if (!cell) return;
    const next = cell.nextElementSibling as HTMLTableCellElement | null;
    if (!next) return;
    const currentSpan = Number(cell.getAttribute("colspan") ?? "1");
    const nextSpan = Number(next.getAttribute("colspan") ?? "1");
    cell.setAttribute("colspan", String(currentSpan + nextSpan));
    cell.innerHTML = `${cell.innerHTML} ${next.innerHTML}`.trim();
    next.remove();
    syncBody();
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
    const body = syncBody();
    persistRow(body, "저장");
    setStatusMessage("문서를 목록에 저장했습니다.");
  };

  const submitApproval = () => {
    setForm((prev) => ({ ...prev, approvalStatus: "pending" }));
    setStatusMessage("결재 상신 상태로 변경했습니다.");
  };

  const saveAndGenerate = async () => {
    const body = syncBody();
    const tableModel = extractTableModel(body);
    const payload: JournalHwpPayload = {
      title: form.title,
      author: form.manager,
      facilityName: form.facilityName,
      journalDate: form.workDate,
      startTime: form.startTime,
      endTime: form.endTime,
      programName: form.program,
      highlights: splitTags(form.tags),
      sections: extractSections(body),
      tableHeaders: tableModel.headers.length > 0 ? tableModel.headers : ["시간", "구분", "내용", "담당자"],
      tableRows:
        tableModel.rows.length > 0
          ? tableModel.rows
          : [[`${form.startTime}~${form.endTime}`, form.recordType, stripHtml(body).slice(0, 80), form.manager]],
      notes: `결재상태: ${approvalLabel(form.approvalStatus)} / 결재라인: ${form.approvalLine.join(" > ")}`
    };

    try {
      setSaveBusy(true);
      const blob = await requestJournalHwp(payload);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = buildFileName(form, "hwp");
      link.click();
      URL.revokeObjectURL(link.href);
      persistRow(body, "실제 HWP 생성");
      setStatusMessage("HWP 생성 및 저장 완료");
    } catch (error) {
      setStatusMessage(`HWP 생성 실패: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setSaveBusy(false);
    }
  };

  const runAi = async (seed?: string) => {
    const prompt = (seed ?? assistantPrompt).trim();
    if (!prompt) return;
    const body = syncBody();
    setAssistantBusy(true);
    setAssistantPrompt("");
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: prompt }]);

    try {
      const response = await requestJournalAiDraft({
        prompt: `${prompt}\n현재 본문: ${stripHtml(body).slice(0, 600)}`,
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
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: response.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: `AI 실패: ${error instanceof Error ? error.message : "unknown"}` }
      ]);
    } finally {
      setAssistantBusy(false);
    }
  };

  const applyAiDraft = (payload: JournalAiDraftResponsePayload) => {
    const draft = payload.draft;
    setForm((prev) => ({
      ...prev,
      title: draft.title || prev.title,
      facilityName: draft.facilityName || prev.facilityName,
      workDate: draft.journalDate || prev.workDate,
      manager: draft.author || prev.manager,
      program: draft.programName || prev.program,
      tags: draft.highlights.join(", "),
      body: renderDraftHtml(draft),
      approvalStatus: "draft"
    }));
    setAssistantMode(payload.mode);
    setStatusMessage(payload.mode === "openai" ? "OpenAI 초안 적용 완료" : "fallback 초안 적용 완료");
  };

  const addApprover = () => {
    const name = approvalInput.trim();
    if (!name) return;
    if (form.approvalLine.includes(name)) {
      setApprovalInput("");
      return;
    }
    setForm((prev) => ({ ...prev, approvalLine: [...prev.approvalLine, name] }));
    setApprovalInput("");
  };

  const removeApprover = (name: string) => {
    setForm((prev) => ({ ...prev, approvalLine: prev.approvalLine.filter((x) => x !== name) }));
  };

  const selectRow = (row: JournalMinutesEntry) => {
    setSelectedId(row.id);
    setForm(toForm(row));
    clearCellSelection();
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const next = removeJournalMinutes(selectedId);
    setRows(next);
    if (next[0]) {
      setSelectedId(next[0].id);
      setForm(toForm(next[0]));
    } else {
      setSelectedId(null);
      setForm(defaultForm);
    }
  };

  const newForm = () => {
    setSelectedId(null);
    setForm({ ...defaultForm, workDate: new Date().toISOString().slice(0, 10) });
    clearCellSelection();
  };

  return (
    <Shell active="documents">
      <section className="page-header">
        <div>
          <p className="eyebrow">일지/회의록 관리</p>
          <h2>표 편집 강화 + 결재라인 + 대시보드 연계</h2>
          <p className="muted-copy">표 셀 선택 후 행/열 추가, 병합, 삭제를 바로 적용할 수 있습니다.</p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="action-strip">
          <Link href="/dashboard" className="ghost-action">관리자 대시보드</Link>
          <Link href="/approvals" className="ghost-action">전자결재 목록</Link>
          <span style={{ color: "#62706f", fontWeight: 700 }}>문서 API: {getJournalApiBaseUrlLabel()}</span>
        </div>
        <div className="stack-item" style={{ marginTop: 10 }}>
          <strong>상태</strong>
          <p>{statusMessage}</p>
        </div>
      </section>

      <section className="workspace-2col">
        <article className="panel">
          <div className="panel-head">
            <h3>문서 목록</h3>
            <span>{filteredRows.length}건</span>
          </div>
          <div className="action-strip">
            <button type="button" className="ghost-action" onClick={newForm}>새 문서</button>
            <button type="button" className="ghost-action" onClick={removeSelected}>삭제</button>
          </div>
          <div className="table-list">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="table-row"
                onClick={() => selectRow(row)}
                style={{ textAlign: "left", borderColor: selectedId === row.id ? "rgba(47,127,122,.45)" : undefined }}
              >
                <div>
                  <strong>{row.workDate} · {row.title}</strong>
                  <p>{row.manager} · {row.recordType} · {approvalLabel(row.approvalStatus)}</p>
                </div>
                <span>HWP</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>문서 편집</h3>
            <span>{form.id ? `문서 #${form.id}` : "신규"}</span>
          </div>

          <form className="editor-form">
            <label>시설명<input value={form.facilityName} onChange={(e) => updateField("facilityName", e.target.value)} /></label>
            <label>분류<input value={form.category} onChange={(e) => updateField("category", e.target.value)} /></label>
            <label>
              기록유형
              <select value={form.recordType} onChange={(e) => updateField("recordType", e.target.value as JournalType)}>
                <option value="운영일지(아동)">운영일지(아동)</option>
                <option value="회의록">회의록</option>
              </select>
            </label>
            <label>일자<input type="date" value={form.workDate} onChange={(e) => updateField("workDate", e.target.value)} /></label>
            <label>담당자<input value={form.manager} onChange={(e) => updateField("manager", e.target.value)} /></label>
            <label>제목<input value={form.title} onChange={(e) => updateField("title", e.target.value)} /></label>
            <label>대상자<input value={form.target} onChange={(e) => updateField("target", e.target.value)} /></label>
            <label>프로그램<input value={form.program} onChange={(e) => updateField("program", e.target.value)} /></label>
            <label>태그<input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} /></label>
            <div className="action-strip">
              <label>시작<input type="time" value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} /></label>
              <label>종료<input type="time" value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} /></label>
            </div>
          </form>

          <div className="stack-item" style={{ marginTop: 14 }}>
            <strong>결재 라인</strong>
            <div className="action-strip" style={{ marginTop: 8 }}>
              {form.approvalLine.map((name) => (
                <button key={name} type="button" className="ghost-action" onClick={() => removeApprover(name)}>
                  {name} ×
                </button>
              ))}
            </div>
            <div className="action-strip" style={{ marginTop: 8 }}>
              <input value={approvalInput} onChange={(e) => setApprovalInput(e.target.value)} placeholder="결재자 추가" />
              <button type="button" className="ghost-action" onClick={addApprover}>추가</button>
              <select value={form.approvalStatus} onChange={(e) => updateField("approvalStatus", e.target.value as ApprovalStatus)}>
                <option value="draft">임시저장</option>
                <option value="pending">결재대기</option>
                <option value="approved">승인완료</option>
                <option value="rejected">반려</option>
              </select>
              <button type="button" className="primary-action" onClick={submitApproval}>결재 상신</button>
            </div>
          </div>

          <div className="rich-toolbar">
            <button type="button" className="ghost-action" onClick={() => exec("bold")}><strong>B</strong></button>
            <button type="button" className="ghost-action" onClick={() => exec("italic")}><em>I</em></button>
            <button type="button" className="ghost-action" onClick={() => exec("underline")}><u>U</u></button>
            <button type="button" className="ghost-action" onClick={() => exec("insertUnorderedList")}>목록</button>
            <button type="button" className="ghost-action" onClick={insertTable}>표 삽입</button>
            <button type="button" className="ghost-action" onClick={addRowBelow}>행 추가</button>
            <button type="button" className="ghost-action" onClick={addColumnRight}>열 추가</button>
            <button type="button" className="ghost-action" onClick={deleteCurrentRow}>행 삭제</button>
            <button type="button" className="ghost-action" onClick={deleteCurrentColumn}>열 삭제</button>
            <button type="button" className="ghost-action" onClick={mergeWithRight}>오른쪽 병합</button>
          </div>

          <div
            ref={editorRef}
            className="rich-editor hwp-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={syncBody}
            onClick={(e) => selectCellFromEvent(e.target)}
          />

          <div className="action-strip" style={{ marginTop: 14 }}>
            <button type="button" className="primary-action" onClick={saveAndGenerate} disabled={saveBusy}>
              {saveBusy ? "HWP 생성 중..." : "실제 HWP 생성 + 저장"}
            </button>
            <button type="button" className="ghost-action" onClick={saveOnly}>저장</button>
            <button
              type="button"
              className="ghost-action"
              onClick={() => downloadText(buildFileName(form, "hwpx"), `<body>${escapeHtml(stripHtml(syncBody()))}</body>`, "application/xml;charset=utf-8")}
            >
              HWPX 내보내기
            </button>
            <button
              type="button"
              className="ghost-action"
              onClick={() => {
                const html = `<!doctype html><html><head><meta charset="utf-8"/></head><body>${syncBody()}</body></html>`;
                downloadText(buildFileName(form, "hwp"), html, "application/x-hwp;charset=utf-8");
              }}
            >
              브라우저 HWP
            </button>
            <button type="button" className="ghost-action" onClick={() => void runAi()} disabled={assistantBusy}>
              {assistantBusy ? "AI 생성 중..." : "AI 초안 생성"}
            </button>
          </div>
        </article>
      </section>

      <DocumentAiPanel
        open={assistantOpen}
        busy={assistantBusy}
        modeLabel={assistantMode === "openai" ? `OpenAI (${assistantModel})` : "fallback"}
        input={assistantPrompt}
        messages={messages}
        quickPrompts={prompts}
        contextLabel={`${form.facilityName} · ${form.recordType} · ${form.workDate}`}
        onInputChange={setAssistantPrompt}
        onPromptSelect={(prompt) => {
          setAssistantPrompt(prompt);
          void runAi(prompt);
        }}
        onSubmit={() => {
          void runAi();
        }}
        onToggle={() => setAssistantOpen((prev) => !prev)}
      />
    </Shell>
  );
}
