export type ApprovalStatus = "임시저장" | "결재대기" | "반려" | "완료";

export type ApprovalItem = {
  id: number;
  formType: "휴가신청서";
  title: string;
  drafter: string;
  reviewer: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
};

const STORAGE_KEY = "bomcare:approvals:v1";

const seedData: ApprovalItem[] = [
  {
    id: 1001,
    formType: "휴가신청서",
    title: "연차 신청 - 한지수",
    drafter: "한지수",
    reviewer: "박민아 팀장",
    leaveType: "연차",
    startDate: "2026-03-21",
    endDate: "2026-03-21",
    reason: "개인 사유",
    status: "결재대기",
    createdAt: "2026-03-16 09:10:00"
  }
];

function parseRows(raw: string | null): ApprovalItem[] {
  if (!raw) return seedData;
  try {
    const parsed = JSON.parse(raw) as ApprovalItem[];
    return Array.isArray(parsed) ? parsed : seedData;
  } catch {
    return seedData;
  }
}

export function getApprovals(): ApprovalItem[] {
  if (typeof window === "undefined") return seedData;
  return parseRows(localStorage.getItem(STORAGE_KEY));
}

export function saveApprovals(rows: ApprovalItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function appendApproval(item: ApprovalItem): ApprovalItem[] {
  const rows = getApprovals();
  const next = [item, ...rows];
  saveApprovals(next);
  return next;
}

export function updateApprovalStatus(id: number, status: ApprovalStatus): ApprovalItem[] {
  const next = getApprovals().map((row) => (row.id === id ? { ...row, status } : row));
  saveApprovals(next);
  return next;
}

export function findApproval(id: number): ApprovalItem | undefined {
  return getApprovals().find((row) => row.id === id);
}

export function resetApprovals(): ApprovalItem[] {
  saveApprovals(seedData);
  return seedData;
}
