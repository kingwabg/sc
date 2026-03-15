export type DocumentAiSelectionType = "none" | "cell" | "range" | "table";

export type DocumentAiTableContext = {
  rowCount: number;
  columnCount: number;
  selectedRows: number[];
  selectedColumns: number[];
  selectedCellTexts: string[];
  matrix: string[][];
};

export type DocumentAiContext = {
  title: string;
  selectedText: string;
  selectionType: DocumentAiSelectionType;
  table: DocumentAiTableContext | null;
};

export type CreateTableAction = {
  type: "create_table";
  rows: number;
  columns: number;
  caption?: string;
  headers?: string[];
  data?: string[][];
};

export type SetSelectedCellsAction = {
  type: "set_selected_cells";
  values: string[][];
};

export type AddRowAction = {
  type: "add_row";
  position: "above" | "below";
  count?: number;
};

export type AddColumnAction = {
  type: "add_column";
  position: "left" | "right";
  count?: number;
};

export type SimpleAction =
  | { type: "delete_rows" }
  | { type: "delete_columns" }
  | { type: "merge_selected_cells" }
  | { type: "split_selected_cell" }
  | { type: "toggle_header"; scope: "row" | "column" | "cell" }
  | { type: "set_alignment"; value: "left" | "center" | "right" }
  | { type: "set_background"; value: string }
  | { type: "remove_table" };

export type DocumentAiAction =
  | CreateTableAction
  | SetSelectedCellsAction
  | AddRowAction
  | AddColumnAction
  | SimpleAction;

export type DocumentAiResponse = {
  reply: string;
  actions: DocumentAiAction[];
  mode: "openai" | "fallback";
};

export const assistantQuickPrompts = [
  "3행 4열 표 만들어줘",
  "선택한 표 첫 줄을 헤더로 바꿔줘",
  "선택한 표 오른쪽에 열 1개 추가해줘",
  "선택 셀 배경을 연노랑으로 바꿔줘",
  "선택한 셀을 가운데 정렬해줘",
  "선택한 표에 월, 담당자, 내용 헤더를 넣어줘"
] as const;

const colorMap: Record<string, string> = {
  yellow: "#fff7c2",
  mint: "#dff4ef",
  blue: "#dce8ff",
  gray: "#eef1f4",
  transparent: "",
  "노랑": "#fff7c2",
  "노란": "#fff7c2",
  "연노랑": "#fff7c2",
  "민트": "#dff4ef",
  "초록": "#dff4ef",
  "하늘": "#dce8ff",
  "파랑": "#dce8ff",
  "회색": "#eef1f4",
  "없애": "",
  "제거": ""
};

function getCount(prompt: string, fallback = 1): number {
  const countMatch = prompt.match(/(\d+)\s*개/);
  if (countMatch) {
    return Math.max(1, Number(countMatch[1]));
  }

  return fallback;
}

function extractHeaderList(prompt: string): string[] {
  const quotedMatch = prompt.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    return quotedMatch[1]
      .split(/[,\n/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const headerAfterMatch = prompt.match(/헤더\s*[:\-]\s*([^\n]+)/);
  if (headerAfterMatch) {
    return headerAfterMatch[1]
      .split(/[,\n/|]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  const headerBeforeMatch = prompt.match(/([A-Za-z0-9가-힣]+(?:\s*,\s*[A-Za-z0-9가-힣]+)+)\s+헤더/);
  if (!headerBeforeMatch) {
    return [];
  }

  return headerBeforeMatch[1]
    .split(/[,\n/|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildHeaderFillAction(prompt: string): DocumentAiAction | null {
  const headers = extractHeaderList(prompt);
  if (headers.length === 0) {
    return null;
  }

  return {
    type: "set_selected_cells",
    values: [headers]
  };
}

function normalizeColor(prompt: string): string | null {
  const matched = Object.keys(colorMap).find((key) => prompt.includes(key));
  return matched ? colorMap[matched] : null;
}

function extractTableShape(prompt: string): { rows: number; columns: number } | null {
  const matrixMatch = prompt.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (matrixMatch) {
    return {
      rows: Math.max(1, Number(matrixMatch[1])),
      columns: Math.max(1, Number(matrixMatch[2]))
    };
  }

  const rowColumnMatch = prompt.match(/(\d+)\s*행.*?(\d+)\s*열/);
  if (rowColumnMatch) {
    return {
      rows: Math.max(1, Number(rowColumnMatch[1])),
      columns: Math.max(1, Number(rowColumnMatch[2]))
    };
  }

  if (prompt.includes("표")) {
    return {
      rows: 3,
      columns: 3
    };
  }

  return null;
}

function createTableAction(prompt: string): DocumentAiAction | null {
  const shape = extractTableShape(prompt);
  if (!shape) {
    return null;
  }

  const headers = extractHeaderList(prompt);
  const rows = Math.max(shape.rows, headers.length > 0 ? 2 : shape.rows);
  const columns = Math.max(shape.columns, headers.length);

  return {
    type: "create_table",
    rows,
    columns,
    headers: headers.length > 0 ? headers : undefined,
    caption: prompt.includes("캡션") ? "AI 생성 표" : undefined
  };
}

function buildFallbackReply(actions: DocumentAiAction[]): string {
  if (actions.length === 0) {
    return "표 생성, 행/열 추가, 병합, 헤더 전환, 배경색, 정렬 같은 명령을 먼저 이해하고 실행할 수 있어요.";
  }

  return "요청을 표 편집 명령으로 바꿔서 바로 반영했어요.";
}

function hasTableSelection(context: DocumentAiContext): boolean {
  return Boolean(context.table);
}

function createNoSelectionReply(): DocumentAiResponse {
  return {
    reply: "먼저 표나 셀을 선택해 주세요. 선택한 범위를 기준으로 수정 명령을 실행할게요.",
    actions: [],
    mode: "fallback"
  };
}

export function parseLocalDocumentCommand(prompt: string, context: DocumentAiContext): DocumentAiResponse {
  const normalized = prompt.trim().toLowerCase();
  const actions: DocumentAiAction[] = [];

  if (!normalized) {
    return {
      reply: "무엇을 바꿀지 한 문장으로 알려주세요. 예: 3행 4열 표 만들어줘",
      actions,
      mode: "fallback"
    };
  }

  if (normalized.includes("표") && (normalized.includes("만들") || normalized.includes("생성"))) {
    const action = createTableAction(prompt);
    if (action) {
      actions.push(action);
    }
  }

  if (normalized.includes("헤더")) {
    const headerFill = buildHeaderFillAction(prompt);
    if (headerFill && hasTableSelection(context)) {
      actions.push(headerFill);
    }

    if (normalized.includes("첫") || normalized.includes("첫줄") || normalized.includes("첫 줄") || normalized.includes("행")) {
      actions.push({ type: "toggle_header", scope: "row" });
    } else if (context.table && context.table.selectedColumns.length > 1) {
      actions.push({ type: "toggle_header", scope: "row" });
    } else if (normalized.includes("열") || normalized.includes("컬럼")) {
      actions.push({ type: "toggle_header", scope: "column" });
    } else {
      actions.push({ type: "toggle_header", scope: "cell" });
    }
  }

  if (normalized.includes("행") && normalized.includes("추가")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({
      type: "add_row",
      position: normalized.includes("위") ? "above" : "below",
      count: getCount(prompt)
    });
  }

  if ((normalized.includes("열") || normalized.includes("컬럼")) && normalized.includes("추가")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({
      type: "add_column",
      position: normalized.includes("왼") ? "left" : "right",
      count: getCount(prompt)
    });
  }

  if (normalized.includes("행") && (normalized.includes("삭제") || normalized.includes("지워"))) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "delete_rows" });
  }

  if ((normalized.includes("열") || normalized.includes("컬럼")) && (normalized.includes("삭제") || normalized.includes("지워"))) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "delete_columns" });
  }

  if (normalized.includes("병합")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "merge_selected_cells" });
  }

  if (normalized.includes("분할")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "split_selected_cell" });
  }

  if (normalized.includes("가운데")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "set_alignment", value: "center" });
  } else if (normalized.includes("오른쪽")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "set_alignment", value: "right" });
  } else if (normalized.includes("왼쪽")) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "set_alignment", value: "left" });
  }

  const background = normalizeColor(prompt);
  if (background !== null) {
    if (!hasTableSelection(context)) return createNoSelectionReply();
    actions.push({ type: "set_background", value: background });
  }

  if ((normalized.includes("값") || normalized.includes("내용") || normalized.includes("채워")) && hasTableSelection(context)) {
    const lines = prompt
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 1) {
      const values = lines
        .slice(1)
        .map((line) => line.split(/[,\t|/]/).map((cell) => cell.trim()).filter(Boolean))
        .filter((row) => row.length > 0);

      if (values.length > 0) {
        actions.push({
          type: "set_selected_cells",
          values
        });
      }
    }
  }

  return {
    reply: buildFallbackReply(actions),
    actions,
    mode: "fallback"
  };
}

export function sanitizeDocumentAiResponse(value: unknown): DocumentAiResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<DocumentAiResponse>;
  if (typeof raw.reply !== "string" || !Array.isArray(raw.actions)) {
    return null;
  }

  return {
    reply: raw.reply,
    actions: raw.actions as DocumentAiAction[],
    mode: raw.mode === "openai" ? "openai" : "fallback"
  };
}
