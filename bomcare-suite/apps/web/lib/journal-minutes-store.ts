export type JournalType = "운영일지(아동)" | "회의록";

export type JournalMinutesEntry = {
  id: number;
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
  hwpFileName: string;
  createdAt: string;
};

const STORAGE_KEY = "bomcare:journal-minutes:v1";

const seedRows: JournalMinutesEntry[] = [
  {
    id: 2026031201,
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
    body: "오전 학습지원과 생활실 점검을 진행했고, 오후에는 개인상담 2건과 보호자 통화를 수행했습니다.",
    hwpFileName: "운영일지_2026-03-12_최하은.hwp",
    createdAt: "2026-03-12 18:10:00"
  }
];

function parseRows(raw: string | null): JournalMinutesEntry[] {
  if (!raw) return seedRows;
  try {
    const parsed = JSON.parse(raw) as JournalMinutesEntry[];
    if (!Array.isArray(parsed)) {
      return seedRows;
    }

    return parsed.map((row) => ({
      ...row,
      facilityName: row.facilityName ?? "새봄 아동센터"
    }));
  } catch {
    return seedRows;
  }
}

function nowLabel(): string {
  return new Date().toLocaleString("ko-KR", { hour12: false });
}

export function getJournalMinutes(): JournalMinutesEntry[] {
  if (typeof window === "undefined") return seedRows;
  return parseRows(localStorage.getItem(STORAGE_KEY));
}

export function saveJournalMinutes(rows: JournalMinutesEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function upsertJournalMinutes(
  payload: Omit<JournalMinutesEntry, "id" | "createdAt"> & { id?: number }
): JournalMinutesEntry[] {
  const prev = getJournalMinutes();
  const id = payload.id ?? Date.now();
  const nextRow: JournalMinutesEntry = {
    ...payload,
    id,
    createdAt: nowLabel()
  };
  const next = [nextRow, ...prev.filter((row) => row.id !== id)];
  saveJournalMinutes(next);
  return next;
}

export function removeJournalMinutes(id: number): JournalMinutesEntry[] {
  const next = getJournalMinutes().filter((row) => row.id !== id);
  saveJournalMinutes(next);
  return next;
}
