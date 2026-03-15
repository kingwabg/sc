export type AppRole = "ADMIN" | "MANAGER" | "STAFF";

export type Department = {
  id: string;
  name: string;
};

export type Position = {
  id: string;
  name: string;
};

export type IdentityUser = {
  id: number;
  loginId: string;
  password: string;
  name: string;
  role: AppRole;
  departmentId: string;
  positionId: string;
  active: boolean;
};

export type SessionUser = {
  id: number;
  loginId: string;
  name: string;
  role: AppRole;
  departmentId: string;
  positionId: string;
};

export type MenuKey =
  | "dashboard"
  | "facility-management"
  | "child-management"
  | "worker-management"
  | "service-management"
  | "board-notice"
  | "board-tasks"
  | "work-schedule"
  | "alerts"
  | "audit-logs"
  | "facilities"
  | "cases"
  | "approvals"
  | "staff"
  | "documents"
  | "identity";

const USERS_KEY = "bomcare:identity:users:v1";
const SESSION_KEY = "bomcare:identity:session:v1";

export const seedDepartments: Department[] = [
  { id: "dept-admin", name: "운영관리부" },
  { id: "dept-care", name: "생활지원팀" },
  { id: "dept-counsel", name: "상담지원팀" }
];

export const seedPositions: Position[] = [
  { id: "pos-director", name: "시설장" },
  { id: "pos-manager", name: "팀장" },
  { id: "pos-worker", name: "담당자" }
];

const seedUsers: IdentityUser[] = [
  {
    id: 1,
    loginId: "admin",
    password: "Admin!2026",
    name: "시설관리자",
    role: "ADMIN",
    departmentId: "dept-admin",
    positionId: "pos-director",
    active: true
  },
  {
    id: 2,
    loginId: "manager",
    password: "Manager!2026",
    name: "상담팀장",
    role: "MANAGER",
    departmentId: "dept-counsel",
    positionId: "pos-manager",
    active: true
  },
  {
    id: 3,
    loginId: "worker",
    password: "Worker!2026",
    name: "생활지도원",
    role: "STAFF",
    departmentId: "dept-care",
    positionId: "pos-worker",
    active: true
  }
];

const menuByRole: Record<AppRole, MenuKey[]> = {
  ADMIN: [
    "dashboard",
    "facility-management",
    "child-management",
    "worker-management",
    "service-management",
    "board-notice",
    "board-tasks",
    "work-schedule",
    "alerts",
    "audit-logs",
    "facilities",
    "cases",
    "approvals",
    "staff",
    "documents",
    "identity"
  ],
  MANAGER: [
    "dashboard",
    "child-management",
    "service-management",
    "board-notice",
    "board-tasks",
    "work-schedule",
    "alerts",
    "cases",
    "approvals",
    "documents"
  ],
  STAFF: [
    "dashboard",
    "child-management",
    "board-tasks",
    "work-schedule",
    "alerts",
    "cases",
    "approvals"
  ]
};

function parseUsers(raw: string | null): IdentityUser[] {
  if (!raw) return seedUsers;
  try {
    const parsed = JSON.parse(raw) as IdentityUser[];
    return Array.isArray(parsed) ? parsed : seedUsers;
  } catch {
    return seedUsers;
  }
}

function parseSession(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getUsers(): IdentityUser[] {
  if (typeof window === "undefined") return seedUsers;
  return parseUsers(localStorage.getItem(USERS_KEY));
}

export function saveUsers(rows: IdentityUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(rows));
}

export function addUser(input: Omit<IdentityUser, "id">): IdentityUser[] {
  const rows = getUsers();
  const nextUser: IdentityUser = {
    ...input,
    id: Date.now()
  };
  const next = [nextUser, ...rows];
  saveUsers(next);
  return next;
}

export function authenticate(loginId: string, password: string): SessionUser | null {
  const user = getUsers().find((row) => row.loginId === loginId && row.password === password && row.active);
  if (!user) return null;
  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    positionId: user.positionId
  };
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  return parseSession(localStorage.getItem(SESSION_KEY));
}

export function setSessionUser(session: SessionUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function canAccess(role: AppRole, menu: MenuKey): boolean {
  return menuByRole[role].includes(menu);
}

export function getAllowedMenus(role: AppRole): MenuKey[] {
  return menuByRole[role];
}

export function getDepartmentName(departmentId: string): string {
  return seedDepartments.find((row) => row.id === departmentId)?.name ?? departmentId;
}

export function getPositionName(positionId: string): string {
  return seedPositions.find((row) => row.id === positionId)?.name ?? positionId;
}
