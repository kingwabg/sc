export type AuditEntry = {
  id: number;
  at: string;
  actor: string;
  module: string;
  action: string;
};

const STORAGE_KEY = "bomcare:audit-logs:v1";
const DEFAULT_ACTOR = "demo.admin";

function nowLabel(): string {
  return new Date().toLocaleString("ko-KR", { hour12: false });
}

export function getAuditLogs(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAuditLog(module: string, action: string, actor: string = DEFAULT_ACTOR): void {
  if (typeof window === "undefined") return;
  const next: AuditEntry = {
    id: Date.now(),
    at: nowLabel(),
    actor,
    module,
    action
  };
  const prev = getAuditLogs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...prev]));
}

export function clearAuditLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
