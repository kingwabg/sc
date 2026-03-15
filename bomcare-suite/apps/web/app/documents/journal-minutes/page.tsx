"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Shell } from "../../../components/shell";
import { DocumentAiPanel } from "../../../components/document-ai-panel";
import {
  getJournalApiBaseUrlLabel,
  requestJournalAiDraft,
  requestJournalAiStatus,
  requestJournalHwp,
  type JournalAiDraftResponsePayload,
  type JournalHwpPayload
} from "../../../lib/journal-document-api";
import {
  getJournalMinutes,
  removeJournalMinutes,
  upsertJournalMinutes,
  type ApprovalStatus,
  type JournalMinutesEntry,
  type JournalType
} from "../../../lib/journal-minutes-store";

type Form = {
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

type Msg = { id: number; role: "assistant" | "user"; content: string };

const defaultForm: Form = {
  facilityName: "늘봄 아동센터",
  workDate: "2026-03-16",
  title: "운영일지",
  manager: "관리자",
  target: "아동 전체",
  program: "생활지도",
  category: "일지",
  recordType: "운영일지(아동)",
  startTime: "09:00",
  endTime: "18:00",
  tags: "일상, 상담",
  body: "<p>본문을 입력하세요.</p>",
  approvalLine: ["담당자", "팀장", "센터장"],
  approvalStatus: "draft"
};

const prompts = ["오늘 운영일지 초안 작성", "회의록 형식으로 정리", "특이사항 중심 요약"] as const;

const labelOf = (s: ApprovalStatus) => (s === "pending" ? "결재대기" : s === "approved" ? "승인완료" : s === "rejected" ? "반려" : "임시저장");
const fileName = (f: Form, ext: "hwp" | "hwpx") => `${f.recordType === "회의록" ? "회의록" : "운영일지"}_${f.workDate}_${f.manager}.${ext}`;
const textOf = (html: string) => ((d) => ((d.innerHTML = html), d.textContent ?? ""))(document.createElement("div"));
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const downloadText = (name: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default function Page() {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLTableCellElement | null>(null);
  const rangeRef = useRef<HTMLTableCellElement[]>([]);
  const anchorRef = useRef<HTMLTableCellElement | null>(null);
  const selectingRef = useRef(false);
  const [rows, setRows] = useState<JournalMinutesEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(defaultForm);
  const [status, setStatus] = useState("연결 확인 중...");
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"openai" | "fallback">("fallback");
  const [assistantInput, setAssistantInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([{ id: Date.now(), role: "assistant", content: "셀 드래그 후 우클릭하면 표 편집 메뉴가 열립니다." }]);

  useEffect(() => {
    const list = getJournalMinutes();
    setRows(list);
    if (list[0]) {
      setSelectedId(list[0].id);
      setForm(list[0]);
    }
    void requestJournalAiStatus().then((s) => setStatus(s.openAiConfigured ? `OpenAI 연결됨 (${s.model})` : "fallback 모드"));
    const stop = () => { selectingRef.current = false; anchorRef.current = null; };
    document.addEventListener("mouseup", stop);
    document.addEventListener("click", () => setMenu({ open: false, x: 0, y: 0 }));
    return () => document.removeEventListener("mouseup", stop);
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== form.body) editorRef.current.innerHTML = form.body;
  }, [form.body, selectedId]);

  const clearSelect = () => {
    editorRef.current?.querySelectorAll(".hwp-table-selected,.hwp-table-selected-cell,.hwp-table-range-cell").forEach((n) => {
      n.classList.remove("hwp-table-selected");
      n.classList.remove("hwp-table-selected-cell");
      n.classList.remove("hwp-table-range-cell");
    });
    selectedRef.current = null;
    rangeRef.current = [];
  };

  const selectOne = (cell: HTMLTableCellElement) => {
    clearSelect();
    selectedRef.current = cell;
    rangeRef.current = [cell];
    cell.classList.add("hwp-table-selected-cell", "hwp-table-range-cell");
    cell.closest("table")?.classList.add("hwp-table-selected");
  };

  const sync = () => setForm((p) => ({ ...p, body: editorRef.current?.innerHTML ?? "" }));
  const exec = (c: string, v?: string) => { editorRef.current?.focus(); document.execCommand(c, false, v); sync(); };
  const insertTable = () => exec("insertHTML", "<table><tr><th>항목</th><th>내용</th></tr><tr><td>입력</td><td>입력</td></tr></table><p></p>");
  const addRow = () => { const c = selectedRef.current; if (!c) return; const r = c.parentElement as HTMLTableRowElement; const n = document.createElement("tr"); for (let i = 0; i < r.cells.length; i += 1) { const td = document.createElement("td"); td.textContent = "입력"; n.appendChild(td); } r.insertAdjacentElement("afterend", n); sync(); };
  const addCol = () => { const c = selectedRef.current; if (!c) return; const r = c.parentElement as HTMLTableRowElement; const t = r.closest("table"); if (!t) return; const i = Array.from(r.cells).indexOf(c); Array.from(t.rows).forEach((row) => { const td = document.createElement(row.querySelector("th") ? "th" : "td"); td.textContent = "입력"; if (i < 0 || i >= row.cells.length - 1) row.appendChild(td); else row.insertBefore(td, row.cells[i + 1]); }); sync(); };
  const delRow = () => { const c = selectedRef.current; if (!c) return; const r = c.parentElement as HTMLTableRowElement; const t = r.closest("table"); if (!t || t.rows.length <= 1) return; r.remove(); clearSelect(); sync(); };
  const delCol = () => { const c = selectedRef.current; if (!c) return; const r = c.parentElement as HTMLTableRowElement; const t = r.closest("table"); if (!t || r.cells.length <= 1) return; const i = Array.from(r.cells).indexOf(c); Array.from(t.rows).forEach((row) => { if (i < row.cells.length) row.cells[i].remove(); }); clearSelect(); sync(); };
  const mergeRange = () => { if (rangeRef.current.length < 2) return; const top = rangeRef.current[0]; top.setAttribute("colspan", String(rangeRef.current.length)); top.innerHTML = rangeRef.current.map((c) => c.textContent?.trim() ?? "").filter(Boolean).join(" / "); rangeRef.current.slice(1).forEach((c) => c.remove()); selectOne(top); sync(); };
  const unmerge = () => { const c = selectedRef.current; if (!c) return; const span = Number(c.getAttribute("colspan") ?? "1"); if (span <= 1) return; c.removeAttribute("colspan"); for (let i = 1; i < span; i += 1) { const td = document.createElement("td"); td.textContent = "입력"; c.parentElement?.insertBefore(td, c.nextSibling); } sync(); };
  const withMenu = (fn: () => void) => { fn(); setMenu({ open: false, x: 0, y: 0 }); };

  const save = () => {
    const next = upsertJournalMinutes({ ...form, body: editorRef.current?.innerHTML ?? "", hwpFileName: fileName(form, "hwp") });
    setRows(next);
    setSelectedId(form.id ?? next[0].id);
  };

  const exportHwp = async () => {
    const body = editorRef.current?.innerHTML ?? "";
    const table = (() => { const box = document.createElement("div"); box.innerHTML = body; const t = box.querySelector("table"); if (!t) return { h: [], r: [] as string[][] }; const rr = Array.from(t.rows).map((r) => Array.from(r.cells).map((c) => c.textContent ?? "")); return { h: rr[0] ?? [], r: rr.slice(1) }; })();
    const payload: JournalHwpPayload = {
      title: form.title, author: form.manager, facilityName: form.facilityName, journalDate: form.workDate,
      startTime: form.startTime, endTime: form.endTime, programName: form.program,
      highlights: form.tags.split(",").map((x) => x.trim()).filter(Boolean),
      sections: [{ heading: "기록 내용", content: textOf(body) || "내용 없음" }],
      tableHeaders: table.h.length > 0 ? table.h : ["시간", "구분", "내용", "담당자"],
      tableRows: table.r.length > 0 ? table.r : [[`${form.startTime}~${form.endTime}`, form.recordType, textOf(body).slice(0, 80), form.manager]],
      notes: `결재상태: ${labelOf(form.approvalStatus)}`
    };
    const blob = await requestJournalHwp(payload);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName(form, "hwp");
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const runAi = async (seed?: string) => {
    const prompt = (seed ?? assistantInput).trim();
    if (!prompt) return;
    const body = editorRef.current?.innerHTML ?? "";
    setAssistantBusy(true);
    setMessages((x) => [...x, { id: Date.now(), role: "user", content: prompt }]);
    try {
      const r: JournalAiDraftResponsePayload = await requestJournalAiDraft({
        prompt: `${prompt}\n현재 본문: ${textOf(body).slice(0, 600)}`,
        author: form.manager, facilityName: form.facilityName, journalDate: form.workDate,
        startTime: form.startTime, endTime: form.endTime, programName: form.program,
        recordType: form.recordType, target: form.target, tags: form.tags, currentBody: textOf(body).slice(0, 2000)
      });
      setAssistantMode(r.mode);
      setForm((f) => ({ ...f, body: r.draft.sections.map((s) => `<h3>${s.heading}</h3><p>${s.content}</p>`).join("") }));
      setMessages((x) => [...x, { id: Date.now() + 1, role: "assistant", content: r.reply }]);
    } finally {
      setAssistantBusy(false);
      setAssistantInput("");
    }
  };

  return (
    <Shell active="documents">
      <section className="page-header"><div><p className="eyebrow">일지/회의록 관리</p><h2>고급 표 편집 + 결재 라인</h2><p className="muted-copy">셀 드래그 다중선택, 범위 병합/해제, 우클릭 컨텍스트 메뉴를 지원합니다.</p></div></section>
      <section className="panel" style={{ marginTop: 16 }}><div className="action-strip"><Link href="/dashboard" className="ghost-action">관리자 대시보드</Link><Link href="/approvals" className="ghost-action">전자결재 목록</Link><span style={{ color: "#62706f", fontWeight: 700 }}>문서 API: {getJournalApiBaseUrlLabel()} · {status}</span></div></section>
      <section className="workspace-2col">
        <article className="panel"><div className="panel-head"><h3>문서 목록</h3><span>{rows.length}건</span></div><div className="action-strip"><button type="button" className="ghost-action" onClick={() => setForm({ ...defaultForm, workDate: new Date().toISOString().slice(0, 10) })}>새 문서</button><button type="button" className="ghost-action" onClick={() => selectedId && setRows(removeJournalMinutes(selectedId))}>삭제</button></div><div className="table-list">{rows.map((row) => <button key={row.id} type="button" className="table-row" onClick={() => { setSelectedId(row.id); setForm(row); clearSelect(); }} style={{ textAlign: "left", borderColor: selectedId === row.id ? "rgba(47,127,122,.45)" : undefined }}><div><strong>{row.workDate} · {row.title}</strong><p>{row.manager} · {row.recordType} · {labelOf(row.approvalStatus)}</p></div><span>HWP</span></button>)}</div></article>
        <article className="panel accent">
          <div className="rich-toolbar"><button type="button" className="ghost-action" onClick={() => exec("bold")}><strong>B</strong></button><button type="button" className="ghost-action" onClick={() => exec("italic")}><em>I</em></button><button type="button" className="ghost-action" onClick={() => exec("underline")}><u>U</u></button><button type="button" className="ghost-action" onClick={insertTable}>표 삽입</button><button type="button" className="ghost-action" onClick={addRow}>행+</button><button type="button" className="ghost-action" onClick={addCol}>열+</button><button type="button" className="ghost-action" onClick={delRow}>행-</button><button type="button" className="ghost-action" onClick={delCol}>열-</button><button type="button" className="ghost-action" onClick={mergeRange}>범위 병합</button><button type="button" className="ghost-action" onClick={unmerge}>병합 해제</button></div>
          <div ref={editorRef} className="rich-editor hwp-editor" contentEditable suppressContentEditableWarning onInput={sync} onMouseDown={(e) => { const c = (e.target as HTMLElement).closest("td,th") as HTMLTableCellElement | null; if (!c) return; selectingRef.current = true; anchorRef.current = c; selectOne(c); }} onMouseOver={(e) => { if (!selectingRef.current || !anchorRef.current) return; const c = (e.target as HTMLElement).closest("td,th") as HTMLTableCellElement | null; if (!c) return; const row = c.parentElement as HTMLTableRowElement; const ar = anchorRef.current.parentElement as HTMLTableRowElement; if (row !== ar) return; const cells = row.cells; const a = Array.from(cells).indexOf(anchorRef.current); const b = Array.from(cells).indexOf(c); if (a < 0 || b < 0) return; clearSelect(); const s = Math.min(a, b); const t = Math.max(a, b); for (let i = s; i <= t; i += 1) { const cell = cells[i] as HTMLTableCellElement; cell.classList.add("hwp-table-range-cell"); rangeRef.current.push(cell); } if (rangeRef.current[0]) { rangeRef.current[0].classList.add("hwp-table-selected-cell"); selectedRef.current = rangeRef.current[0]; anchorRef.current.closest("table")?.classList.add("hwp-table-selected"); } }} onContextMenu={(e) => { const c = (e.target as HTMLElement).closest("td,th") as HTMLTableCellElement | null; if (!c) return; e.preventDefault(); if (!rangeRef.current.includes(c)) selectOne(c); setMenu({ open: true, x: e.clientX + 4, y: e.clientY + 4 }); }} />
          {menu.open ? <div className="hwp-context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}><button type="button" onClick={() => withMenu(addRow)}>아래 행 추가</button><button type="button" onClick={() => withMenu(addCol)}>오른쪽 열 추가</button><button type="button" onClick={() => withMenu(delRow)}>현재 행 삭제</button><button type="button" onClick={() => withMenu(delCol)}>현재 열 삭제</button><button type="button" onClick={() => withMenu(mergeRange)}>선택 범위 병합</button><button type="button" onClick={() => withMenu(unmerge)}>병합 해제</button></div> : null}
          <div className="hwp-table-hint">표 셀을 드래그한 뒤 우클릭하면 고급 편집 메뉴를 사용할 수 있습니다.</div>
          <div className="action-strip" style={{ marginTop: 12 }}><button type="button" className="primary-action" onClick={exportHwp}>실제 HWP 생성</button><button type="button" className="ghost-action" onClick={save}>저장</button><button type="button" className="ghost-action" onClick={() => downloadText(fileName(form, "hwpx"), `<body>${esc(textOf(editorRef.current?.innerHTML ?? ""))}</body>`, "application/xml;charset=utf-8")}>HWPX 내보내기</button><button type="button" className="ghost-action" onClick={() => void runAi()} disabled={assistantBusy}>{assistantBusy ? "AI 생성 중..." : "AI 초안 생성"}</button></div>
        </article>
      </section>
      <DocumentAiPanel open={assistantOpen} busy={assistantBusy} modeLabel={assistantMode} input={assistantInput} messages={messages} quickPrompts={prompts} contextLabel={`${form.facilityName} · ${form.recordType}`} onInputChange={setAssistantInput} onPromptSelect={(p) => { setAssistantInput(p); void runAi(p); }} onSubmit={() => void runAi()} onToggle={() => setAssistantOpen((v) => !v)} />
    </Shell>
  );
}
