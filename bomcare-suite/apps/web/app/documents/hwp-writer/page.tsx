"use client";

import { ChangeEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { DocumentAiPanel } from "../../../components/document-ai-panel";
import { Shell } from "../../../components/shell";
import { appendAuditLog } from "../../../lib/audit-log";
import {
  assistantQuickPrompts,
  DocumentAiAction,
  DocumentAiContext,
  DocumentAiResponse,
  parseLocalDocumentCommand
} from "../../../lib/document-ai";

type Orientation = "portrait" | "landscape";
type StylePreset = "행정기본" | "회의록" | "보고서";
type RibbonTab = "파일" | "편집" | "보기" | "입력" | "서식" | "쪽";
type TableMenuState = {
  open: boolean;
  x: number;
  y: number;
};

type PageSettings = {
  orientation: Orientation;
  paperSize: "A4";
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  headerMargin: number;
  footerMargin: number;
};

type SavedDoc = {
  id: number;
  title: string;
  author: string;
  html: string;
  stylePreset: StylePreset;
  pageSettings: PageSettings;
  headerText: string;
  footerText: string;
  showPageNumber: boolean;
  showGrid: boolean;
  updatedAt: string;
};

type AiMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const CURRENT_KEY = "bomcare:hwp-editor:current:v2";
const LIST_KEY = "bomcare:hwp-editor:list:v2";

const defaultPageSettings: PageSettings = {
  orientation: "portrait",
  paperSize: "A4",
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 18,
  marginRight: 18,
  headerMargin: 12,
  footerMargin: 12
};

const stylePresets: Record<
  StylePreset,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: string; note: string }
> = {
  행정기본: {
    fontFamily: "\"Malgun Gothic\", \"Apple SD Gothic Neo\", sans-serif",
    fontSize: 14,
    lineHeight: 1.75,
    letterSpacing: "-0.01em",
    note: "공문/행정 문서에 맞춘 기본형"
  },
  회의록: {
    fontFamily: "\"IBM Plex Sans KR\", \"Malgun Gothic\", sans-serif",
    fontSize: 13,
    lineHeight: 1.7,
    letterSpacing: "0",
    note: "회의 일시, 참석자, 안건 기록 중심"
  },
  보고서: {
    fontFamily: "\"Aptos\", \"Malgun Gothic\", sans-serif",
    fontSize: 15,
    lineHeight: 1.8,
    letterSpacing: "-0.02em",
    note: "장문 보고/제안서에 맞춘 읽기형"
  }
};

const standardChecklist = [
  ["스타일/문단 체계", "이번 단계", "스타일 프리셋과 쪽 설정 추가"],
  ["머리말/꼬리말", "이번 단계", "문서별 고정 영역과 쪽 번호 토글"],
  ["쪽 설정/여백", "이번 단계", "세로/가로, 여백, 머리말/꼬리말 간격 반영"],
  ["표/결재란", "이번 단계", "표 삽입과 결재란 블록 삽입"],
  ["메모/변경 추적", "다음 단계", "검토 탭 수준 기능 예정"],
  ["실제 OWPML HWPX 패키지", "다음 단계", "현재는 구조화 XML export 수준"]
] as const;

const ribbonTabs: RibbonTab[] = ["파일", "편집", "보기", "입력", "서식", "쪽"];

const fontNameOptions = [
  "\"Malgun Gothic\", \"Apple SD Gothic Neo\", sans-serif",
  "\"IBM Plex Sans KR\", \"Malgun Gothic\", sans-serif",
  "\"Aptos\", \"Malgun Gothic\", sans-serif",
  "\"Nanum Gothic\", \"Malgun Gothic\", sans-serif"
] as const;

const fontSizeOptions = [
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "18", value: "5" },
  { label: "24", value: "6" }
] as const;

const defaultDoc: SavedDoc = {
  id: Date.now(),
  title: "운영일지(아동) - 기본 양식",
  author: "최하은",
  html: `
<h2 style="text-align:center;">운영일지(아동)</h2>
<table>
  <tr><th>일자</th><td>2026-03-16</td><th>담당자</th><td>최하은</td></tr>
  <tr><th>운영시간</th><td>09:00 ~ 18:00</td><th>프로그램</th><td>집계 기준</td></tr>
</table>
<p><strong>1. 아동 현황</strong></p>
<p>내용을 입력하세요.</p>
<p><strong>2. 특이사항 및 조치</strong></p>
<p>내용을 입력하세요.</p>
`,
  stylePreset: "행정기본",
  pageSettings: defaultPageSettings,
  headerText: "새봄 아동복지 운영센터",
  footerText: "운영 문서",
  showPageNumber: true,
  showGrid: false,
  updatedAt: "2026-03-16 09:00:00"
};

function nowLabel(): string {
  return new Date().toLocaleString("ko-KR", { hour12: false });
}

function normalizeDoc(input: Partial<SavedDoc>): SavedDoc {
  return {
    id: input.id ?? Date.now(),
    title: input.title ?? defaultDoc.title,
    author: input.author ?? defaultDoc.author,
    html: input.html ?? defaultDoc.html,
    stylePreset: input.stylePreset ?? defaultDoc.stylePreset,
    pageSettings: {
      ...defaultPageSettings,
      ...(input.pageSettings ?? {})
    },
    headerText: input.headerText ?? defaultDoc.headerText,
    footerText: input.footerText ?? defaultDoc.footerText,
    showPageNumber: input.showPageNumber ?? defaultDoc.showPageNumber,
    showGrid: input.showGrid ?? defaultDoc.showGrid,
    updatedAt: input.updatedAt ?? nowLabel()
  };
}

function parseList(raw: string | null): SavedDoc[] {
  if (!raw) return [defaultDoc];
  try {
    const parsed = JSON.parse(raw) as SavedDoc[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [defaultDoc];
    return parsed.map((row) => normalizeDoc(row));
  } catch {
    return [defaultDoc];
  }
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function decodeXml(text: string): string {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function getTagValue(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1] ?? null;
}

function buildApprovalBlock(): string {
  return `
<table>
  <tr><th style="width:90px;">결재</th><th>담당자</th><th>팀장</th><th>센터장</th></tr>
  <tr><td>서명</td><td style="height:56px;"></td><td></td><td></td></tr>
</table>
<p></p>
`;
}

function buildPageBreak(): string {
  return `<div class="page-break">쪽 나누기</div><p></p>`;
}

function buildExportHtml(doc: SavedDoc): string {
  const preset = stylePresets[doc.stylePreset];
  const width = doc.pageSettings.orientation === "landscape" ? "297mm" : "210mm";
  const minHeight = doc.pageSettings.orientation === "landscape" ? "210mm" : "297mm";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${doc.title}</title>
<style>
body { background:#d8dadd; padding:20px; font-family:${preset.fontFamily}; }
.sheet { width:${width}; min-height:${minHeight}; margin:0 auto; background:#fff; box-shadow:0 12px 30px rgba(0,0,0,.08); }
.header, .footer { color:#4f5a62; font-size:12px; display:flex; justify-content:space-between; padding:0 ${doc.pageSettings.marginRight}mm 0 ${doc.pageSettings.marginLeft}mm; }
.header { min-height:${doc.pageSettings.headerMargin}mm; align-items:flex-end; border-bottom:1px solid #ddd; }
.footer { min-height:${doc.pageSettings.footerMargin}mm; align-items:flex-start; border-top:1px solid #ddd; }
.content { padding:${doc.pageSettings.marginTop}mm ${doc.pageSettings.marginRight}mm ${doc.pageSettings.marginBottom}mm ${doc.pageSettings.marginLeft}mm; font-size:${preset.fontSize}px; line-height:${preset.lineHeight}; letter-spacing:${preset.letterSpacing}; }
table { width:100%; border-collapse:collapse; margin:12px 0; }
th, td { border:1px solid #999; padding:7px; }
.page-break { page-break-before:always; border-top:2px dashed #bbb; color:#777; padding-top:8px; margin:24px 0; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header"><span>${doc.headerText}</span><span>${doc.showPageNumber ? "1" : ""}</span></div>
    <div class="content">${doc.html}</div>
    <div class="footer"><span>${doc.footerText}</span><span>${doc.author}</span></div>
  </div>
</body>
</html>`;
}

function buildHwpxLikeXml(doc: SavedDoc): string {
  const text = doc.html
    .replace(/<[^>]+>/g, "\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<bomcareDocument>
  <meta>
    <title>${doc.title}</title>
    <author>${doc.author}</author>
    <stylePreset>${doc.stylePreset}</stylePreset>
    <updatedAt>${doc.updatedAt}</updatedAt>
  </meta>
  <page>
    <paperSize>${doc.pageSettings.paperSize}</paperSize>
    <orientation>${doc.pageSettings.orientation}</orientation>
    <marginTop>${doc.pageSettings.marginTop}</marginTop>
    <marginBottom>${doc.pageSettings.marginBottom}</marginBottom>
    <marginLeft>${doc.pageSettings.marginLeft}</marginLeft>
    <marginRight>${doc.pageSettings.marginRight}</marginRight>
    <headerMargin>${doc.pageSettings.headerMargin}</headerMargin>
    <footerMargin>${doc.pageSettings.footerMargin}</footerMargin>
  </page>
  <header>${doc.headerText}</header>
  <footer>${doc.footerText}</footer>
  <showPageNumber>${doc.showPageNumber}</showPageNumber>
  <body>${text}</body>
</bomcareDocument>`;
}

export default function HwpWriterPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<SavedDoc>(defaultDoc);
  const docsRef = useRef<SavedDoc[]>([defaultDoc]);
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null);
  const selectedTableRef = useRef<HTMLTableElement | null>(null);
  const selectedCellsRef = useRef<HTMLTableCellElement[]>([]);
  const dragAnchorCellRef = useRef<HTMLTableCellElement | null>(null);
  const isTableSelectingRef = useRef(false);
  const suppressTableClickRef = useRef(false);

  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [current, setCurrent] = useState<SavedDoc>(defaultDoc);
  const [zoom, setZoom] = useState(100);
  const [lastSaved, setLastSaved] = useState("-");
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>("편집");
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [fontName, setFontName] = useState<string>(fontNameOptions[0]);
  const [fontSize, setFontSize] = useState<string>("4");
  const [tableMenu, setTableMenu] = useState<TableMenuState>({ open: false, x: 0, y: 0 });
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"openai" | "fallback">("fallback");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AiMessage[]>([
    {
      id: Date.now(),
      role: "assistant",
      content: "표를 선택한 뒤 3행 4열 표 만들어줘, 첫 줄을 헤더로 바꿔줘처럼 말하면 바로 실행합니다."
    }
  ]);

  useEffect(() => {
    const list = parseList(localStorage.getItem(LIST_KEY));
    const currentRaw = localStorage.getItem(CURRENT_KEY);
    const loaded = currentRaw ? normalizeDoc(JSON.parse(currentRaw) as SavedDoc) : list[0];

    setDocs(list);
    setCurrent(loaded);
    setLastSaved(loaded.updatedAt);
    docsRef.current = list;
    currentRef.current = loaded;

    if (editorRef.current) {
      editorRef.current.innerHTML = loaded.html;
    }
  }, []);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== current.html) {
      editorRef.current.innerHTML = current.html;
    }
  }, [current.id, current.html]);

  useEffect(() => {
    const closeMenu = () => setTableMenu({ open: false, x: 0, y: 0 });
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const stopTableSelection = () => {
      isTableSelectingRef.current = false;
      dragAnchorCellRef.current = null;
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeByEscape);
    document.addEventListener("mouseup", stopTableSelection);

    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeByEscape);
      document.removeEventListener("mouseup", stopTableSelection);
    };
  }, []);

  const presetStyle = useMemo(() => stylePresets[current.stylePreset], [current.stylePreset]);
  const paperWidth = current.pageSettings.orientation === "landscape" ? "297mm" : "210mm";
  const paperHeight = current.pageSettings.orientation === "landscape" ? "210mm" : "297mm";

  const updateCurrent = <K extends keyof SavedDoc>(key: K, value: SavedDoc[K]) => {
    setCurrent((prev) => ({ ...prev, [key]: value }));
  };

  const updatePageSetting = <K extends keyof PageSettings>(key: K, value: PageSettings[K]) => {
    setCurrent((prev) => ({
      ...prev,
      pageSettings: {
        ...prev.pageSettings,
        [key]: value
      }
    }));
  };

  const buildSnapshot = (): SavedDoc =>
    normalizeDoc({
      ...currentRef.current,
      html: editorRef.current?.innerHTML ?? currentRef.current.html,
      updatedAt: nowLabel()
    });

  const persistSnapshot = (snapshot: SavedDoc, manual: boolean) => {
    const next = [snapshot, ...docsRef.current.filter((row) => row.id !== snapshot.id)];
    setDocs(next);
    setCurrent(snapshot);
    setLastSaved(snapshot.updatedAt);
    docsRef.current = next;
    currentRef.current = snapshot;
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
    localStorage.setItem(CURRENT_KEY, JSON.stringify(snapshot));
    if (manual) {
      appendAuditLog("HWP편집기", `문서 저장: ${snapshot.title}`);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!editorRef.current) return;
      persistSnapshot(buildSnapshot(), false);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateCurrent("html", editorRef.current?.innerHTML ?? current.html);
  };

  const syncEditorHtml = () => {
    updateCurrent("html", editorRef.current?.innerHTML ?? current.html);
  };

  const clearTableSelection = () => {
    const root = editorRef.current;
    if (!root) return;
    root.querySelectorAll(".hwp-table-selected").forEach((node) => node.classList.remove("hwp-table-selected"));
    root.querySelectorAll(".hwp-table-selected-cell").forEach((node) => node.classList.remove("hwp-table-selected-cell"));
    root.querySelectorAll(".hwp-table-range-cell").forEach((node) => node.classList.remove("hwp-table-range-cell"));
  };

  const setTableSelection = (cell: HTMLTableCellElement | null) => {
    clearTableSelection();
    selectedCellRef.current = cell;
    selectedTableRef.current = cell?.closest("table") ?? null;
    selectedCellsRef.current = cell ? [cell] : [];

    if (!cell) return;
    cell.classList.add("hwp-table-range-cell");
    cell.classList.add("hwp-table-selected-cell");
    cell.closest("table")?.classList.add("hwp-table-selected");
  };

  const sortCellsByPosition = (cells: HTMLTableCellElement[]) =>
    [...new Set(cells)].sort((leftCell, rightCell) => {
      const leftRowIndex = (leftCell.parentElement as HTMLTableRowElement | null)?.rowIndex ?? 0;
      const rightRowIndex = (rightCell.parentElement as HTMLTableRowElement | null)?.rowIndex ?? 0;

      if (leftRowIndex !== rightRowIndex) {
        return leftRowIndex - rightRowIndex;
      }

      return leftCell.cellIndex - rightCell.cellIndex;
    });

  const restoreTableSelection = (cells: HTMLTableCellElement[]) => {
    const sorted = sortCellsByPosition(cells);

    if (sorted.length === 0) {
      setTableSelection(null);
      return;
    }

    if (sorted.length === 1) {
      setTableSelection(sorted[0]);
      return;
    }

    applyRangeSelection(sorted[0], sorted[sorted.length - 1]);
  };

  const applyRangeSelection = (startCell: HTMLTableCellElement, endCell: HTMLTableCellElement) => {
    const table = startCell.closest("table");
    if (!table || table !== endCell.closest("table")) {
      setTableSelection(startCell);
      return;
    }

    clearTableSelection();
    selectedCellRef.current = endCell;
    selectedTableRef.current = table;
    table.classList.add("hwp-table-selected");

    const startRowIndex = (startCell.parentElement as HTMLTableRowElement).rowIndex;
    const endRowIndex = (endCell.parentElement as HTMLTableRowElement).rowIndex;
    const top = Math.min(startRowIndex, endRowIndex);
    const bottom = Math.max(startRowIndex, endRowIndex);
    const left = Math.min(startCell.cellIndex, endCell.cellIndex);
    const right = Math.max(startCell.cellIndex, endCell.cellIndex);

    const selected: HTMLTableCellElement[] = [];
    for (let rowIndex = top; rowIndex <= bottom; rowIndex += 1) {
      const row = table.rows[rowIndex];
      if (!row) continue;
      for (let cellIndex = left; cellIndex <= right; cellIndex += 1) {
        const cell = row.cells[cellIndex];
        if (!cell) continue;
        cell.classList.add("hwp-table-range-cell");
        selected.push(cell);
      }
    }

    const sorted = sortCellsByPosition(selected);
    if (sorted.length > 0) {
      sorted[0].classList.add("hwp-table-selected-cell");
      selectedCellRef.current = sorted[0];
    }
    selectedCellsRef.current = sorted;
  };

  const getSelectedCells = () => {
    if (selectedCellsRef.current.length > 0) {
      return sortCellsByPosition(selectedCellsRef.current);
    }
    return selectedCellRef.current ? [selectedCellRef.current] : [];
  };

  const getSelectedRowIndexes = () =>
    [...new Set(getSelectedCells().map((cell) => (cell.parentElement as HTMLTableRowElement | null)?.rowIndex ?? -1))]
      .filter((rowIndex) => rowIndex >= 0)
      .sort((left, right) => left - right);

  const getSelectedColumnIndexes = () =>
    [...new Set(getSelectedCells().map((cell) => cell.cellIndex))].sort((left, right) => left - right);

  const mergeSelectedRange = () => {
    const cells = getSelectedCells();
    if (cells.length < 2) return false;

    const sorted = sortCellsByPosition(cells);
    const table = sorted[0]?.closest("table");
    if (!table || sorted.some((cell) => cell.closest("table") !== table)) {
      return false;
    }

    const rowIndexes = sorted.map((cell) => (cell.parentElement as HTMLTableRowElement).rowIndex);
    const columnIndexes = sorted.map((cell) => cell.cellIndex);
    const top = Math.min(...rowIndexes);
    const bottom = Math.max(...rowIndexes);
    const left = Math.min(...columnIndexes);
    const right = Math.max(...columnIndexes);

    const rectangularCells: HTMLTableCellElement[] = [];
    for (let rowIndex = top; rowIndex <= bottom; rowIndex += 1) {
      const row = table.rows[rowIndex];
      if (!row) return false;

      for (let columnIndex = left; columnIndex <= right; columnIndex += 1) {
        const cell = row.cells[columnIndex];
        if (!cell) return false;
        rectangularCells.push(cell);
      }
    }

    if (
      rectangularCells.length !== sorted.length ||
      rectangularCells.some((cell, index) => cell !== sorted[index])
    ) {
      return false;
    }

    const topLeftCell = rectangularCells[0];
    const mergedHtml = rectangularCells
      .map((cell) => cell.innerHTML.trim())
      .filter(Boolean)
      .join("<br>");

    topLeftCell.rowSpan = bottom - top + 1;
    topLeftCell.colSpan = right - left + 1;
    topLeftCell.innerHTML = mergedHtml || "<br>";

    rectangularCells.slice(1).forEach((cell) => cell.remove());

    setTableSelection(topLeftCell);
    syncEditorHtml();
    return true;
  };

  const replaceCellTag = (cell: HTMLTableCellElement, nextTag: "td" | "th") => {
    const replacement = document.createElement(nextTag);
    Array.from(cell.attributes).forEach((attr) => replacement.setAttribute(attr.name, attr.value));
    replacement.className = cell.className;
    replacement.innerHTML = cell.innerHTML;
    replacement.colSpan = cell.colSpan;
    replacement.rowSpan = cell.rowSpan;
    cell.parentElement?.replaceChild(replacement, cell);
    return replacement as HTMLTableCellElement;
  };

  const applyFontName = (value: string) => {
    setFontName(value);
    exec("fontName", value);
  };

  const applyFontSize = (value: string) => {
    setFontSize(value);
    exec("fontSize", value);
  };

  const applyBlockStyle = (value: "p" | "h1" | "h2" | "blockquote") => {
    exec("formatBlock", value);
  };

  const insertTable = () => {
    exec(
      "insertHTML",
      `<table><tr><th>항목</th><th>내용</th></tr><tr><td>입력</td><td>입력</td></tr></table><p></p>`
    );
  };

  const insertApprovalBox = () => {
    exec("insertHTML", buildApprovalBlock());
  };

  const insertPageBreak = () => {
    exec("insertHTML", buildPageBreak());
  };

  const insertTableRow = (position: "above" | "below") => {
    const cell = selectedCellRef.current;
    const table = selectedTableRef.current;
    const selectedRowIndexes = getSelectedRowIndexes();
    if (!cell || !table || selectedRowIndexes.length === 0) return;

    const targetRowIndex = position === "above" ? selectedRowIndexes[0] : selectedRowIndexes[selectedRowIndexes.length - 1];
    const row = table.rows[targetRowIndex] as HTMLTableRowElement | undefined;
    const section = row?.parentElement;
    if (!row || !section) return;

    const newRow = row.cloneNode(true) as HTMLTableRowElement;
    Array.from(newRow.cells).forEach((item) => {
      item.innerHTML = "<br>";
      item.classList.remove("hwp-table-selected-cell");
      item.classList.remove("hwp-table-range-cell");
    });

    if (position === "above") {
      section.insertBefore(newRow, row);
    } else {
      section.insertBefore(newRow, row.nextSibling);
    }

    setTableSelection(newRow.cells[cell.cellIndex] ?? newRow.cells[0] ?? null);
    syncEditorHtml();
  };

  const insertTableColumn = (position: "left" | "right") => {
    const cell = selectedCellRef.current;
    const table = selectedTableRef.current;
    const selectedColumnIndexes = getSelectedColumnIndexes();
    if (!cell || !table || selectedColumnIndexes.length === 0) return;
    const columnIndex =
      position === "left" ? selectedColumnIndexes[0] : selectedColumnIndexes[selectedColumnIndexes.length - 1];

    Array.from(table.rows).forEach((row) => {
      const baseCell = row.cells[Math.min(columnIndex, row.cells.length - 1)];
      const newCell = document.createElement(baseCell?.tagName.toLowerCase() === "th" ? "th" : "td");
      newCell.innerHTML = "<br>";
      if (!baseCell) {
        row.appendChild(newCell);
        return;
      }
      if (position === "left") {
        row.insertBefore(newCell, baseCell);
      } else {
        row.insertBefore(newCell, baseCell.nextSibling);
      }
    });

    const newIndex = position === "left" ? columnIndex : columnIndex + 1;
    const currentRow = cell.parentElement as HTMLTableRowElement | null;
    setTableSelection(table.rows[currentRow?.rowIndex ?? 0]?.cells[newIndex] ?? null);
    syncEditorHtml();
  };

  const deleteCurrentRow = () => {
    const table = selectedTableRef.current;
    const selectedRowIndexes = getSelectedRowIndexes();
    if (!table || selectedRowIndexes.length === 0) return;

    [...selectedRowIndexes].reverse().forEach((rowIndex) => {
      table.rows[rowIndex]?.remove();
    });

    if (table.rows.length === 0) {
      table.remove();
      setTableSelection(null);
    } else {
      const nextRowIndex = Math.max(0, selectedRowIndexes[0] - 1);
      setTableSelection(table.rows[nextRowIndex]?.cells[0] ?? table.rows[0]?.cells[0] ?? null);
    }
    syncEditorHtml();
  };

  const deleteCurrentColumn = () => {
    const table = selectedTableRef.current;
    const selectedColumnIndexes = getSelectedColumnIndexes();
    if (!table || selectedColumnIndexes.length === 0) return;

    Array.from(table.rows).forEach((row) => {
      [...selectedColumnIndexes].reverse().forEach((columnIndex) => {
        if (row.cells.length > columnIndex) {
          row.deleteCell(columnIndex);
        }
      });
    });

    if (!table.rows[0] || table.rows[0].cells.length === 0) {
      table.remove();
      setTableSelection(null);
    } else {
      const nextIndex = Math.max(0, selectedColumnIndexes[0] - 1);
      setTableSelection(table.rows[0].cells[nextIndex] ?? table.rows[0].cells[0] ?? null);
    }
    syncEditorHtml();
  };

  const mergeCellWithRight = () => {
    if (mergeSelectedRange()) return;

    const cell = selectedCellRef.current;
    if (!cell) return;
    const nextCell = cell.nextElementSibling as HTMLTableCellElement | null;
    if (!nextCell) return;

    cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
    if ((nextCell.innerHTML || "").trim()) {
      cell.innerHTML = `${cell.innerHTML}<br>${nextCell.innerHTML}`;
    }
    nextCell.remove();
    setTableSelection(cell);
    syncEditorHtml();
  };

  const splitCurrentCell = () => {
    const cell = selectedCellRef.current;
    const table = selectedTableRef.current;
    if (!cell || !table) return;

    const rowSpan = cell.rowSpan || 1;
    const colSpan = cell.colSpan || 1;
    if (rowSpan <= 1 && colSpan <= 1) return;

    const row = cell.parentElement as HTMLTableRowElement | null;
    const startRowIndex = row?.rowIndex ?? 0;
    const startCellIndex = cell.cellIndex;
    const tagName = cell.tagName.toLowerCase();
    const nextSibling = cell.nextSibling;

    cell.rowSpan = 1;
    cell.colSpan = 1;

    for (let columnOffset = 1; columnOffset < colSpan; columnOffset += 1) {
      const newCell = document.createElement(tagName);
      newCell.innerHTML = "<br>";
      row?.insertBefore(newCell, nextSibling);
    }

    for (let rowOffset = 1; rowOffset < rowSpan; rowOffset += 1) {
      const targetRow = table.rows[startRowIndex + rowOffset];
      if (!targetRow) continue;
      const referenceCell = targetRow.cells[startCellIndex] ?? null;

      for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
        const newCell = document.createElement(tagName);
        newCell.innerHTML = "<br>";
        targetRow.insertBefore(newCell, referenceCell);
      }
    }

    setTableSelection(cell);
    syncEditorHtml();
  };

  const removeCurrentTable = () => {
    const table = selectedTableRef.current;
    if (!table) return;
    table.remove();
    setTableSelection(null);
    syncEditorHtml();
  };

  const toggleHeaderRow = () => {
    const rows = [
      ...new Set(
        getSelectedCells()
          .map((cell) => cell.parentElement)
          .filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement)
      )
    ];
    if (rows.length === 0) return;

    const switchToHeader = rows.some((row) => Array.from(row.cells).some((item) => item.tagName.toLowerCase() === "td"));
    const nextSelected: HTMLTableCellElement[] = [];

    rows.forEach((row) => {
      Array.from(row.cells).forEach((item) => {
        nextSelected.push(replaceCellTag(item, switchToHeader ? "th" : "td"));
      });
    });

    restoreTableSelection(nextSelected);
    syncEditorHtml();
  };

  const toggleHeaderColumn = () => {
    const table = selectedTableRef.current;
    const columnIndexes = getSelectedColumnIndexes();
    if (!table || columnIndexes.length === 0) return;

    const switchToHeader = columnIndexes.some((columnIndex) =>
      Array.from(table.rows).some((row) => row.cells[columnIndex]?.tagName.toLowerCase() === "td")
    );
    const nextSelected: HTMLTableCellElement[] = [];

    Array.from(table.rows).forEach((row) => {
      columnIndexes.forEach((columnIndex) => {
        const target = row.cells[columnIndex];
        if (!target) return;
        nextSelected.push(replaceCellTag(target, switchToHeader ? "th" : "td"));
      });
    });

    restoreTableSelection(nextSelected);
    syncEditorHtml();
  };

  const toggleHeaderCell = () => {
    const cells = getSelectedCells();
    if (cells.length === 0) return;

    const nextSelected = cells.map((cell) => {
      const nextTag = cell.tagName.toLowerCase() === "th" ? "td" : "th";
      return replaceCellTag(cell, nextTag);
    });

    restoreTableSelection(nextSelected);
    syncEditorHtml();
  };

  const setSelectedCellAlignment = (align: "left" | "center" | "right") => {
    const cells = getSelectedCells();
    if (cells.length === 0) return;

    cells.forEach((cell) => {
      cell.style.textAlign = align;
    });

    restoreTableSelection(cells);
    syncEditorHtml();
  };

  const setSelectedCellBackground = (color: string) => {
    const cells = getSelectedCells();
    if (cells.length === 0) return;

    cells.forEach((cell) => {
      cell.style.backgroundColor = color;
    });

    restoreTableSelection(cells);
    syncEditorHtml();
  };

  const setCurrentTableWidth = (width: string) => {
    const table = selectedTableRef.current;
    if (!table) return;
    table.style.width = width;
    syncEditorHtml();
  };

  const toggleTableCaption = () => {
    const table = selectedTableRef.current;
    if (!table) return;
    if (table.caption) {
      table.caption.remove();
    } else {
      const caption = table.createCaption();
      caption.innerText = "표 설명";
      caption.style.captionSide = "top";
      caption.style.fontWeight = "700";
      caption.style.marginBottom = "8px";
    }
    syncEditorHtml();
  };

  const pushAssistantMessage = (role: AiMessage["role"], content: string) => {
    setAssistantMessages((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        role,
        content
      }
    ]);
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const getCellText = (cell: HTMLTableCellElement) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "";

  const getCurrentAiContext = (): DocumentAiContext => {
    const browserSelection = typeof window !== "undefined" ? window.getSelection() : null;
    const cells = getSelectedCells();
    const table = selectedTableRef.current;

    if (!table) {
      return {
        title: current.title,
        selectedText: browserSelection?.toString().trim() ?? "",
        selectionType: "none",
        table: null
      };
    }

    const matrix = Array.from(table.rows)
      .slice(0, 8)
      .map((row) =>
        Array.from(row.cells)
          .slice(0, 8)
          .map((cell) => getCellText(cell as HTMLTableCellElement))
      );

    return {
      title: current.title,
      selectedText: cells.map(getCellText).filter(Boolean).join(" | ") || browserSelection?.toString().trim() || "",
      selectionType: cells.length > 1 ? "range" : "cell",
      table: {
        rowCount: table.rows.length,
        columnCount: Math.max(0, ...Array.from(table.rows).map((row) => row.cells.length)),
        selectedRows: getSelectedRowIndexes(),
        selectedColumns: getSelectedColumnIndexes(),
        selectedCellTexts: cells.map(getCellText).filter(Boolean).slice(0, 16),
        matrix
      }
    };
  };

  const getAiContextLabel = () => {
    const context = getCurrentAiContext();
    if (!context.table) {
      return "선택된 표가 없습니다";
    }

    return `${context.table.rowCount}행 ${context.table.columnCount}열, 선택 행 ${context.table.selectedRows.length || 0}, 선택 열 ${context.table.selectedColumns.length || 0}`;
  };

  const insertHtmlIntoEditor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    const hasSelectionInEditor =
      Boolean(selection?.rangeCount) && Boolean(selection?.anchorNode && editor.contains(selection.anchorNode));

    if (hasSelectionInEditor) {
      document.execCommand("insertHTML", false, html);
    } else {
      editor.insertAdjacentHTML("beforeend", html);
    }

    syncEditorHtml();
  };

  const buildTableMarkup = (action: Extract<DocumentAiAction, { type: "create_table" }>) => {
    const headerCount = action.headers?.length ?? 0;
    const bodyRows = Math.max(action.rows - (headerCount > 0 ? 1 : 0), action.data?.length ?? 0, 1);
    const columnCount = Math.max(
      action.columns,
      headerCount,
      ...(action.data ?? []).map((row) => row.length)
    );

    const headHtml =
      headerCount > 0
        ? `<tr>${Array.from({ length: columnCount }, (_, index) => `<th>${escapeHtml(action.headers?.[index] ?? `항목 ${index + 1}`)}</th>`).join("")}</tr>`
        : "";

    const bodyHtml = Array.from({ length: bodyRows }, (_, rowIndex) => {
      const rowData = action.data?.[rowIndex] ?? [];
      const cells = Array.from({ length: columnCount }, (_, columnIndex) => `<td>${escapeHtml(rowData[columnIndex] ?? "") || "<br>"}</td>`);
      return `<tr>${cells.join("")}</tr>`;
    }).join("");

    const captionHtml = action.caption ? `<caption>${escapeHtml(action.caption)}</caption>` : "";
    return `<table>${captionHtml}${headHtml}${bodyHtml}</table><p></p>`;
  };

  const createTableFromAction = (action: Extract<DocumentAiAction, { type: "create_table" }>) => {
    insertHtmlIntoEditor(buildTableMarkup(action));

    const editor = editorRef.current;
    const lastTable = editor?.querySelector("table:last-of-type") as HTMLTableElement | null;
    const firstCell = lastTable?.querySelector("th, td") as HTMLTableCellElement | null;
    setTableSelection(firstCell);
  };

  const ensureTableDimensions = (table: HTMLTableElement, rowCount: number, columnCount: number) => {
    while (table.rows.length < rowCount) {
      const newRow = table.insertRow();
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const cell = document.createElement("td");
        cell.innerHTML = "<br>";
        newRow.appendChild(cell);
      }
    }

    Array.from(table.rows).forEach((row, rowIndex) => {
      while (row.cells.length < columnCount) {
        const cell = document.createElement(rowIndex === 0 && row.querySelector("th") ? "th" : "td");
        cell.innerHTML = "<br>";
        row.appendChild(cell);
      }
    });
  };

  const setSelectedCellsFromValues = (values: string[][]) => {
    const table = selectedTableRef.current;
    const cells = getSelectedCells();
    const anchorCell = cells[0] ?? selectedCellRef.current;

    if (!table || !anchorCell || values.length === 0) return;

    const selectedRows = getSelectedRowIndexes();
    const selectedColumns = getSelectedColumnIndexes();
    const startRow = selectedRows.length > 0 ? selectedRows[0] : (anchorCell.parentElement as HTMLTableRowElement).rowIndex;
    const startColumn = selectedColumns.length > 0 ? selectedColumns[0] : anchorCell.cellIndex;
    const neededRowCount = startRow + values.length;
    const neededColumnCount = startColumn + Math.max(...values.map((row) => row.length));

    ensureTableDimensions(table, neededRowCount, neededColumnCount);

    const touchedCells: HTMLTableCellElement[] = [];
    values.forEach((rowValues, rowOffset) => {
      rowValues.forEach((value, columnOffset) => {
        const targetCell = table.rows[startRow + rowOffset]?.cells[startColumn + columnOffset] as HTMLTableCellElement | undefined;
        if (!targetCell) return;
        targetCell.innerHTML = escapeHtml(value) || "<br>";
        touchedCells.push(targetCell);
      });
    });

    restoreTableSelection(touchedCells);
    syncEditorHtml();
  };

  const runDocumentAiAction = (action: DocumentAiAction) => {
    switch (action.type) {
      case "create_table":
        createTableFromAction(action);
        break;
      case "set_selected_cells":
        setSelectedCellsFromValues(action.values);
        break;
      case "add_row":
        for (let count = 0; count < (action.count ?? 1); count += 1) {
          insertTableRow(action.position);
        }
        break;
      case "add_column":
        for (let count = 0; count < (action.count ?? 1); count += 1) {
          insertTableColumn(action.position);
        }
        break;
      case "delete_rows":
        deleteCurrentRow();
        break;
      case "delete_columns":
        deleteCurrentColumn();
        break;
      case "merge_selected_cells":
        mergeCellWithRight();
        break;
      case "split_selected_cell":
        splitCurrentCell();
        break;
      case "toggle_header":
        if (action.scope === "row") {
          toggleHeaderRow();
        } else if (action.scope === "column") {
          toggleHeaderColumn();
        } else {
          toggleHeaderCell();
        }
        break;
      case "set_alignment":
        setSelectedCellAlignment(action.value);
        break;
      case "set_background":
        setSelectedCellBackground(action.value);
        break;
      case "remove_table":
        removeCurrentTable();
        break;
      default:
        break;
    }
  };

  const submitAssistantPrompt = async (seedPrompt?: string) => {
    const prompt = (seedPrompt ?? assistantPrompt).trim();
    if (!prompt) return;

    setAssistantBusy(true);
    if (!seedPrompt) {
      setAssistantPrompt("");
    }

    pushAssistantMessage("user", prompt);

    const context = getCurrentAiContext();
    try {
      const response = await fetch("/api/document-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt, context })
      });

      if (!response.ok) {
        throw new Error("request failed");
      }

      const payload = (await response.json()) as DocumentAiResponse;
      setAssistantMode(payload.mode);
      payload.actions.forEach((action) => runDocumentAiAction(action));
      pushAssistantMessage("assistant", payload.reply);
    } catch {
      const fallback = parseLocalDocumentCommand(prompt, context);
      setAssistantMode("fallback");
      fallback.actions.forEach((action) => runDocumentAiAction(action));
      pushAssistantMessage("assistant", fallback.reply);
    } finally {
      setAssistantBusy(false);
    }
  };

  const handleRibbonTab = (tab: RibbonTab) => {
    if (tab === activeRibbonTab && !ribbonCollapsed) {
      setRibbonCollapsed(true);
      return;
    }
    setActiveRibbonTab(tab);
    setRibbonCollapsed(false);
  };

  const handleEditorClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressTableClickRef.current) {
      suppressTableClickRef.current = false;
      return;
    }

    const target = event.target as HTMLElement;
    const cell = target.closest("td, th") as HTMLTableCellElement | null;
    setTableSelection(cell);
  };

  const handleEditorMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const cell = target.closest("td, th") as HTMLTableCellElement | null;

    if (!cell) {
      dragAnchorCellRef.current = null;
      isTableSelectingRef.current = false;
      suppressTableClickRef.current = false;
      setTableSelection(null);
      return;
    }

    event.preventDefault();
    dragAnchorCellRef.current = cell;
    isTableSelectingRef.current = true;
    suppressTableClickRef.current = false;
    applyRangeSelection(cell, cell);
  };

  const handleEditorMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isTableSelectingRef.current || !dragAnchorCellRef.current) return;

    const target = event.target as HTMLElement;
    const cell = target.closest("td, th") as HTMLTableCellElement | null;
    if (!cell) return;

    if (cell !== dragAnchorCellRef.current) {
      suppressTableClickRef.current = true;
    }

    applyRangeSelection(dragAnchorCellRef.current, cell);
  };

  const handleEditorContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const cell = target.closest("td, th") as HTMLTableCellElement | null;
    if (!cell) return;
    event.preventDefault();
    event.stopPropagation();

    const selectedCells = getSelectedCells();
    const clickedInsideSelection = selectedCells.includes(cell);
    if (!clickedInsideSelection) {
      setTableSelection(cell);
    }

    setTableMenu({
      open: true,
      x: event.clientX,
      y: event.clientY
    });
  };

  const newDoc = () => {
    const next = normalizeDoc({
      ...defaultDoc,
      id: Date.now(),
      title: "새 문서",
      author: current.author,
      updatedAt: nowLabel()
    });
    setCurrent(next);
    setLastSaved("-");
    if (editorRef.current) {
      editorRef.current.innerHTML = next.html;
    }
    appendAuditLog("HWP편집기", "새 문서 생성");
  };

  const openDoc = (target: SavedDoc) => {
    const next = normalizeDoc(target);
    setCurrent(next);
    setLastSaved(next.updatedAt);
    localStorage.setItem(CURRENT_KEY, JSON.stringify(next));
    if (editorRef.current) {
      editorRef.current.innerHTML = next.html;
    }
  };

  const deleteDoc = (targetId: number) => {
    const next = docs.filter((row) => row.id !== targetId);
    if (next.length === 0) return;
    setDocs(next);
    docsRef.current = next;
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
    if (current.id === targetId) {
      openDoc(next[0]);
    }
    appendAuditLog("HWP편집기", `문서 삭제: ${targetId}`);
  };

  const exportHwp = () => {
    const snapshot = buildSnapshot();
    download(`${snapshot.title}.hwp`, buildExportHtml(snapshot), "application/x-hwp;charset=utf-8");
    appendAuditLog("HWP편집기", `HWP 내보내기: ${snapshot.title}`);
  };

  const exportHwpx = () => {
    const snapshot = buildSnapshot();
    download(`${snapshot.title}.hwpx`, buildHwpxLikeXml(snapshot), "application/xml;charset=utf-8");
    appendAuditLog("HWP편집기", `HWPX 구조 내보내기: ${snapshot.title}`);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lower = file.name.toLowerCase();
    const imported = normalizeDoc({
      ...current,
      id: Date.now(),
      title: file.name.replace(/\.[^.]+$/, "") || "가져온 문서",
      updatedAt: nowLabel()
    });

    if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".hwp")) {
      imported.html = text.includes("<html") ? text : `<p>${text}</p>`;
    } else if (lower.endsWith(".hwpx") || lower.endsWith(".xml")) {
      const bodyText = decodeXml(getTagValue(text, "body") ?? text);
      imported.html = `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`;
      imported.title = getTagValue(text, "title") ?? imported.title;
      imported.author = getTagValue(text, "author") ?? imported.author;
      const stylePreset = getTagValue(text, "stylePreset");
      if (stylePreset === "행정기본" || stylePreset === "회의록" || stylePreset === "보고서") {
        imported.stylePreset = stylePreset;
      }
      imported.headerText = getTagValue(text, "header") ?? imported.headerText;
      imported.footerText = getTagValue(text, "footer") ?? imported.footerText;
    } else {
      imported.html = `<p>${text.replace(/\n/g, "<br/>")}</p>`;
    }

    setCurrent(imported);
    if (editorRef.current) {
      editorRef.current.innerHTML = imported.html;
    }
    appendAuditLog("HWP편집기", `문서 가져오기: ${file.name}`);
    event.target.value = "";
  };

  const renderRibbonPanel = () => {
    if (ribbonCollapsed) return null;

    if (activeRibbonTab === "파일") {
      return (
        <div className="hwp-ribbon-body">
          <div className="hwp-ribbon-group">
            <strong>문서</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={newDoc}>새 문서</button>
              <button type="button" className="ribbon-tool" onClick={() => persistSnapshot(buildSnapshot(), true)}>저장</button>
              <button type="button" className="ribbon-tool" onClick={exportHwp}>HWP</button>
              <button type="button" className="ribbon-tool" onClick={exportHwpx}>HWPX</button>
              <button type="button" className="ribbon-tool" onClick={() => window.print()}>인쇄</button>
            </div>
          </div>
        </div>
      );
    }

    if (activeRibbonTab === "편집") {
      return (
        <div className="hwp-ribbon-body">
          <div className="hwp-ribbon-group">
            <strong>글자</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={() => exec("bold")}><strong>B</strong></button>
              <button type="button" className="ribbon-tool" onClick={() => exec("italic")}><em>I</em></button>
              <button type="button" className="ribbon-tool" onClick={() => exec("underline")}><u>U</u></button>
              <button type="button" className="ribbon-tool" onClick={() => exec("removeFormat")}>서식 지움</button>
            </div>
          </div>
          <div className="hwp-ribbon-group">
            <strong>문단</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={() => exec("justifyLeft")}>좌</button>
              <button type="button" className="ribbon-tool" onClick={() => exec("justifyCenter")}>중</button>
              <button type="button" className="ribbon-tool" onClick={() => exec("justifyRight")}>우</button>
              <button type="button" className="ribbon-tool" onClick={() => exec("insertUnorderedList")}>글머리</button>
            </div>
          </div>
        </div>
      );
    }

    if (activeRibbonTab === "보기") {
      return (
        <div className="hwp-ribbon-body">
          <div className="hwp-ribbon-group">
            <strong>화면</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={() => setZoom(90)}>90%</button>
              <button type="button" className="ribbon-tool" onClick={() => setZoom(100)}>100%</button>
              <button type="button" className="ribbon-tool" onClick={() => setZoom(120)}>120%</button>
              <button
                type="button"
                className={`ribbon-tool ${current.showGrid ? "active" : ""}`}
                onClick={() => updateCurrent("showGrid", !current.showGrid)}
              >
                격자
              </button>
              <button
                type="button"
                className={`ribbon-tool ${current.showPageNumber ? "active" : ""}`}
                onClick={() => updateCurrent("showPageNumber", !current.showPageNumber)}
              >
                쪽번호
              </button>
            </div>
          </div>
          <div className="hwp-ribbon-group wide">
            <strong>표준 점검</strong>
            <div className="hwp-ribbon-summary">
              {standardChecklist.map(([feature, status]) => (
                <span key={feature}>{feature} · {status}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeRibbonTab === "입력") {
      return (
        <div className="hwp-ribbon-body">
          <div className="hwp-ribbon-group">
            <strong>삽입</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={insertTable}>표</button>
              <button type="button" className="ribbon-tool" onClick={insertApprovalBox}>결재란</button>
              <button type="button" className="ribbon-tool" onClick={insertPageBreak}>쪽 나누기</button>
            </div>
          </div>
          <div className="hwp-ribbon-group">
            <strong>스타일 블록</strong>
            <div className="hwp-ribbon-tools">
              <button type="button" className="ribbon-tool" onClick={() => applyBlockStyle("h1")}>제목1</button>
              <button type="button" className="ribbon-tool" onClick={() => applyBlockStyle("h2")}>제목2</button>
              <button type="button" className="ribbon-tool" onClick={() => applyBlockStyle("p")}>본문</button>
              <button type="button" className="ribbon-tool" onClick={() => applyBlockStyle("blockquote")}>인용</button>
            </div>
          </div>
        </div>
      );
    }

    if (activeRibbonTab === "서식") {
      return (
        <div className="hwp-ribbon-body">
          <div className="hwp-ribbon-group">
            <strong>문서 스타일</strong>
            <div className="hwp-ribbon-fields">
              <label>
                스타일
                <select value={current.stylePreset} onChange={(e) => updateCurrent("stylePreset", e.target.value as StylePreset)}>
                  <option value="행정기본">행정기본</option>
                  <option value="회의록">회의록</option>
                  <option value="보고서">보고서</option>
                </select>
              </label>
              <span>{stylePresets[current.stylePreset].note}</span>
            </div>
          </div>
          <div className="hwp-ribbon-group">
            <strong>선택 글자</strong>
            <div className="hwp-ribbon-fields">
              <label>
                글꼴
                <select value={fontName} onChange={(e) => applyFontName(e.target.value)}>
                  {fontNameOptions.map((option) => (
                    <option key={option} value={option}>{option.split(",")[0].replaceAll("\"", "")}</option>
                  ))}
                </select>
              </label>
              <label>
                크기
                <select value={fontSize} onChange={(e) => applyFontSize(e.target.value)}>
                  {fontSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hwp-ribbon-body">
        <div className="hwp-ribbon-group wide">
          <strong>쪽 설정</strong>
          <div className="hwp-ribbon-fields page">
            <label>
              방향
              <select
                value={current.pageSettings.orientation}
                onChange={(e) => updatePageSetting("orientation", e.target.value as Orientation)}
              >
                <option value="portrait">세로</option>
                <option value="landscape">가로</option>
              </select>
            </label>
            <label>위 여백<input type="number" value={current.pageSettings.marginTop} onChange={(e) => updatePageSetting("marginTop", Number(e.target.value) || 0)} /></label>
            <label>아래 여백<input type="number" value={current.pageSettings.marginBottom} onChange={(e) => updatePageSetting("marginBottom", Number(e.target.value) || 0)} /></label>
            <label>왼쪽 여백<input type="number" value={current.pageSettings.marginLeft} onChange={(e) => updatePageSetting("marginLeft", Number(e.target.value) || 0)} /></label>
            <label>오른쪽 여백<input type="number" value={current.pageSettings.marginRight} onChange={(e) => updatePageSetting("marginRight", Number(e.target.value) || 0)} /></label>
            <label>머리말<input value={current.headerText} onChange={(e) => updateCurrent("headerText", e.target.value)} /></label>
            <label>꼬리말<input value={current.footerText} onChange={(e) => updateCurrent("footerText", e.target.value)} /></label>
          </div>
        </div>
      </div>
    );
  };

  const runTableAction = (action: () => void) => {
    action();
    setTableMenu({ open: false, x: 0, y: 0 });
  };

  return (
    <Shell active="documents">
      <section className="page-header">
        <div>
          <p className="eyebrow">HWP 편집기</p>
          <h2>표준 HWP 작업 흐름을 반영한 내부 편집기</h2>
          <p className="muted-copy">
            스타일, 쪽 설정, 머리말/꼬리말, 저장본 관리까지 붙여서 문서 구조 중심으로 고도화했습니다.
          </p>
        </div>
      </section>

      <section className="hwp-layout">
        <article className="panel">
          <div className="panel-head">
            <h3>저장본 목록</h3>
            <span>{docs.length}건</span>
          </div>
          <div className="action-strip">
            <button type="button" className="primary-action" onClick={newDoc}>새 문서</button>
            <label className="ghost-action" style={{ cursor: "pointer" }}>
              파일 가져오기
              <input type="file" onChange={importFile} style={{ display: "none" }} />
            </label>
          </div>
          <div className="table-list">
            {docs.map((row) => (
              <div key={row.id} className="table-row">
                <button type="button" className="ghost-action" onClick={() => openDoc(row)}>{row.title}</button>
                <button type="button" className="x-action" onClick={() => deleteDoc(row.id)}>x</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <section className="panel">
            <div className="action-strip">
              <label>문서명<input value={current.title} onChange={(e) => updateCurrent("title", e.target.value)} /></label>
              <label>작성자<input value={current.author} onChange={(e) => updateCurrent("author", e.target.value)} /></label>
              <label>
                확대
                <select value={String(zoom)} onChange={(e) => setZoom(Number(e.target.value))}>
                  <option value="80">80%</option>
                  <option value="90">90%</option>
                  <option value="100">100%</option>
                  <option value="110">110%</option>
                  <option value="120">120%</option>
                </select>
              </label>
              <span className="hwp-status-copy">자동저장 15초 · 마지막 저장 {lastSaved}</span>
            </div>
          </section>

          <section className="hwp-ribbon">
            <div className="hwp-ribbon-tabs">
              {ribbonTabs.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  className={`hwp-ribbon-tab ${activeRibbonTab === tab ? "active" : ""}`}
                  onClick={() => handleRibbonTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <button type="button" className="hwp-ribbon-toggle" onClick={() => setRibbonCollapsed((prev) => !prev)}>
                {ribbonCollapsed ? "리본 펼치기" : "리본 접기"}
              </button>
            </div>
            {renderRibbonPanel()}
            <div className="hwp-quickbar">
              <select value={fontName} onChange={(e) => applyFontName(e.target.value)}>
                {fontNameOptions.map((option) => (
                  <option key={option} value={option}>{option.split(",")[0].replaceAll("\"", "")}</option>
                ))}
              </select>
              <select value={fontSize} onChange={(e) => applyFontSize(e.target.value)}>
                {fontSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button type="button" className="ghost-action" onClick={() => exec("bold")}><strong>가</strong></button>
              <button type="button" className="ghost-action" onClick={() => exec("justifyLeft")}>좌</button>
              <button type="button" className="ghost-action" onClick={() => exec("justifyCenter")}>중</button>
              <button type="button" className="ghost-action" onClick={() => exec("justifyRight")}>우</button>
            </div>
          </section>

          <div className="hwp-canvas-wrap">
            <div className="hwp-paper" style={{ transform: `scale(${zoom / 100})`, width: paperWidth }}>
              <div className="hwp-sheet" style={{ minHeight: paperHeight }}>
                <div
                  className="hwp-running-head"
                  style={{
                    minHeight: `${current.pageSettings.headerMargin}mm`,
                    paddingLeft: `${current.pageSettings.marginLeft}mm`,
                    paddingRight: `${current.pageSettings.marginRight}mm`
                  }}
                >
                  <span>{current.headerText}</span>
                  <span>{current.showPageNumber ? "1" : ""}</span>
                </div>

                <div
                  ref={editorRef}
                  className={`hwp-editor ${current.showGrid ? "show-grid" : ""}`}
                  contentEditable
                  suppressContentEditableWarning
                  onMouseDown={handleEditorMouseDown}
                  onMouseMove={handleEditorMouseMove}
                  onClick={handleEditorClick}
                  onContextMenu={handleEditorContextMenu}
                  onInput={() => updateCurrent("html", editorRef.current?.innerHTML ?? current.html)}
                  style={{
                    paddingTop: `${current.pageSettings.marginTop}mm`,
                    paddingBottom: `${current.pageSettings.marginBottom}mm`,
                    paddingLeft: `${current.pageSettings.marginLeft}mm`,
                    paddingRight: `${current.pageSettings.marginRight}mm`,
                    fontFamily: presetStyle.fontFamily,
                    fontSize: `${presetStyle.fontSize}px`,
                    lineHeight: String(presetStyle.lineHeight),
                    letterSpacing: presetStyle.letterSpacing
                  }}
                />

                <div
                  className="hwp-running-foot"
                  style={{
                    minHeight: `${current.pageSettings.footerMargin}mm`,
                    paddingLeft: `${current.pageSettings.marginLeft}mm`,
                    paddingRight: `${current.pageSettings.marginRight}mm`
                  }}
                >
                  <span>{current.footerText}</span>
                  <span>{current.author}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="action-strip">
            <button type="button" className="primary-action" onClick={() => persistSnapshot(buildSnapshot(), true)}>저장</button>
            <button type="button" className="ghost-action" onClick={exportHwp}>HWP 내보내기</button>
            <button type="button" className="ghost-action" onClick={exportHwpx}>HWPX 구조 내보내기</button>
            <button type="button" className="ghost-action" onClick={() => window.print()}>인쇄</button>
          </div>

          <div className="hwp-table-hint">
            표 셀을 클릭하면 선택되고, 우클릭하면 행/열 추가, 삭제, 병합 같은 편집 메뉴가 열립니다.
          </div>
        </article>
      </section>

      {tableMenu.open ? (
        <div className="hwp-context-menu" style={{ left: tableMenu.x, top: tableMenu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="hwp-context-section">
            <strong>행 / 열</strong>
            <button type="button" onClick={() => runTableAction(() => insertTableRow("above"))}>행 위에 추가</button>
            <button type="button" onClick={() => runTableAction(() => insertTableRow("below"))}>행 아래에 추가</button>
            <button type="button" onClick={() => runTableAction(() => insertTableColumn("left"))}>열 왼쪽에 추가</button>
            <button type="button" onClick={() => runTableAction(() => insertTableColumn("right"))}>열 오른쪽에 추가</button>
            <button type="button" onClick={() => runTableAction(deleteCurrentRow)}>현재 행 삭제</button>
            <button type="button" onClick={() => runTableAction(deleteCurrentColumn)}>현재 열 삭제</button>
          </div>

          <div className="hwp-context-section">
            <strong>병합 / 분할</strong>
            <button type="button" onClick={() => runTableAction(mergeCellWithRight)}>오른쪽 셀과 병합</button>
            <button type="button" onClick={() => runTableAction(splitCurrentCell)}>셀 분할</button>
          </div>

          <div className="hwp-context-section">
            <strong>헤더 / 캡션</strong>
            <button type="button" onClick={() => runTableAction(toggleHeaderRow)}>헤더 행 전환</button>
            <button type="button" onClick={() => runTableAction(toggleHeaderColumn)}>헤더 열 전환</button>
            <button type="button" onClick={() => runTableAction(toggleHeaderCell)}>헤더 셀 전환</button>
            <button type="button" onClick={() => runTableAction(toggleTableCaption)}>표 캡션 토글</button>
          </div>

          <div className="hwp-context-section">
            <strong>셀 서식</strong>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellAlignment("left"))}>텍스트 왼쪽 정렬</button>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellAlignment("center"))}>텍스트 가운데 정렬</button>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellAlignment("right"))}>텍스트 오른쪽 정렬</button>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellBackground(""))}>배경 지우기</button>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellBackground("#fff7c2"))}>배경 노랑</button>
            <button type="button" onClick={() => runTableAction(() => setSelectedCellBackground("#dff4ef"))}>배경 민트</button>
          </div>

          <div className="hwp-context-section">
            <strong>표 속성</strong>
            <button type="button" onClick={() => runTableAction(() => setCurrentTableWidth("60%"))}>표 너비 60%</button>
            <button type="button" onClick={() => runTableAction(() => setCurrentTableWidth("80%"))}>표 너비 80%</button>
            <button type="button" onClick={() => runTableAction(() => setCurrentTableWidth("100%"))}>표 너비 100%</button>
            <button type="button" onClick={() => runTableAction(removeCurrentTable)}>표 삭제</button>
          </div>
        </div>
      ) : null}

      <DocumentAiPanel
        open={assistantOpen}
        busy={assistantBusy}
        modeLabel={assistantMode === "openai" ? "OpenAI" : "규칙 모드"}
        input={assistantPrompt}
        messages={assistantMessages}
        quickPrompts={assistantQuickPrompts}
        contextLabel={getAiContextLabel()}
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
