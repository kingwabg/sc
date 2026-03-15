"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AppRole,
  canAccess,
  clearSessionUser,
  getDepartmentName,
  getPositionName,
  getSessionUser,
  MenuKey,
  SessionUser
} from "../lib/identity-store";

type ActiveMenu =
  | "dashboard"
  | "documents"
  | "login"
  | "facilities"
  | "cases"
  | "approvals"
  | "staff"
  | "facilityMgmt"
  | "childMgmt"
  | "workerMgmt"
  | "serviceMgmt"
  | "noticeBoard"
  | "taskBoard"
  | "workSchedule"
  | "alerts"
  | "auditLogs"
  | "identity";

type ShellProps = {
  children: ReactNode;
  active?: ActiveMenu;
};

export function Shell({ children, active }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [railPinned, setRailPinned] = useState(false);
  const [railHover, setRailHover] = useState(false);

  useEffect(() => {
    setSession(getSessionUser());
    if (typeof window !== "undefined") {
      setRailPinned(localStorage.getItem("bomcare:ui:railPinned:v1") === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bomcare:ui:railPinned:v1", railPinned ? "true" : "false");
    }
  }, [railPinned]);

  const role: AppRole | null = session?.role ?? null;

  const menus = useMemo(
    () => [
      { key: "dashboard" as MenuKey, href: "/dashboard", label: "대시보드", activeKey: "dashboard" as ActiveMenu },
      { key: "facility-management" as MenuKey, href: "/facility-management", label: "시설관리", activeKey: "facilityMgmt" as ActiveMenu },
      { key: "child-management" as MenuKey, href: "/child-management", label: "아동관리", activeKey: "childMgmt" as ActiveMenu },
      { key: "worker-management" as MenuKey, href: "/worker-management", label: "종사자관리", activeKey: "workerMgmt" as ActiveMenu },
      { key: "service-management" as MenuKey, href: "/service-management", label: "서비스관리", activeKey: "serviceMgmt" as ActiveMenu },
      { key: "board-notice" as MenuKey, href: "/board/notice", label: "공지게시판", activeKey: "noticeBoard" as ActiveMenu },
      { key: "board-tasks" as MenuKey, href: "/board/tasks", label: "업무게시판", activeKey: "taskBoard" as ActiveMenu },
      { key: "work-schedule" as MenuKey, href: "/work-schedule", label: "일정·근태", activeKey: "workSchedule" as ActiveMenu },
      { key: "alerts" as MenuKey, href: "/alerts", label: "알림·쪽지", activeKey: "alerts" as ActiveMenu },
      { key: "audit-logs" as MenuKey, href: "/audit-logs", label: "감사로그", activeKey: "auditLogs" as ActiveMenu },
      { key: "facilities" as MenuKey, href: "/facilities", label: "시설 현황", activeKey: "facilities" as ActiveMenu },
      { key: "cases" as MenuKey, href: "/cases", label: "사례관리", activeKey: "cases" as ActiveMenu },
      { key: "approvals" as MenuKey, href: "/approvals", label: "결재 요청", activeKey: "approvals" as ActiveMenu },
      { key: "staff" as MenuKey, href: "/staff", label: "직원 관리", activeKey: "staff" as ActiveMenu },
      { key: "documents" as MenuKey, href: "/documents", label: "문서센터", activeKey: "documents" as ActiveMenu },
      { key: "identity" as MenuKey, href: "/identity", label: "계정·조직도", activeKey: "identity" as ActiveMenu }
    ],
    []
  );

  const visibleMenus = useMemo(() => {
    if (!role) return [];
    return menus.filter((menu) => canAccess(role, menu.key));
  }, [menus, role]);

  const logout = () => {
    clearSessionUser();
    router.push("/login");
  };

  const railOpen = railPinned || railHover;

  if (!session) {
    return (
      <main className="landing">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">인증 필요</p>
            <h1>로그인 후 서비스 화면에 접근할 수 있습니다.</h1>
            <p>권한 기반 메뉴(RBAC)가 적용되어 계정 역할에 따라 접근 가능한 기능이 다르게 표시됩니다.</p>
            <div className="hero-actions">
              <Link href="/login" className="primary-action">로그인으로 이동</Link>
              <Link href="/" className="ghost-action">소개 화면</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className={`app-shell ${railOpen ? "rail-expanded" : "rail-collapsed"}`}>
      <aside
        className="rail"
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
      >
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setRailPinned((prev) => !prev)}
          title={railPinned ? "사이드바 고정 해제" : "사이드바 고정"}
        >
          {railPinned ? "고정됨" : "메뉴"}
        </button>

        {!railOpen ? (
          <nav className="rail-mini-nav">
            {visibleMenus.slice(0, 9).map((menu) => (
              <Link
                key={`mini-${menu.href}`}
                href={menu.href}
                className={pathname === menu.href ? "active" : ""}
                title={menu.label}
              >
                {menu.label.slice(0, 1)}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="rail-main">
          <div>
            <p className="rail-kicker">BOMCARE SUITE</p>
            <h1>새봄 아동복지 운영센터</h1>
            <p className="rail-copy">
              사례관리, 생활지원, 행정문서, 보고 흐름을 한곳에 모은 아동 사회복지시설 운영 플랫폼입니다.
            </p>
            <div className="auth-footnote">
              <strong>{session.name}</strong>
              <span>{getDepartmentName(session.departmentId)} · {getPositionName(session.positionId)}</span>
              <span>권한: {session.role}</span>
            </div>
          </div>

          <nav className="rail-nav">
            {visibleMenus.map((menu) => (
              <Link
                className={active === menu.activeKey || pathname === menu.href ? "active" : ""}
                href={menu.href}
                key={menu.href}
              >
                {menu.label}
              </Link>
            ))}
            <button className="ghost-action" type="button" onClick={logout}>로그아웃</button>
          </nav>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
