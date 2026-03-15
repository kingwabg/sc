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
import styles from "./shell.module.css";

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

type SectionKey = "overview" | "operations" | "people" | "work" | "system";

type MenuDefinition = {
  key: MenuKey;
  href: string;
  label: string;
  activeKey: ActiveMenu;
  short: string;
  description: string;
  section: SectionKey;
};

const sectionMeta: Record<SectionKey, { label: string }> = {
  overview: { label: "Overview" },
  operations: { label: "Operations" },
  people: { label: "People" },
  work: { label: "Workflow" },
  system: { label: "System" }
};

export function Shell({ children, active }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [railPinned, setRailPinned] = useState(true);
  const [railHover, setRailHover] = useState(false);

  useEffect(() => {
    setSession(getSessionUser());
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bomcare:ui:railPinned:v2");
      setRailPinned(saved === null ? true : saved === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bomcare:ui:railPinned:v2", railPinned ? "true" : "false");
    }
  }, [railPinned]);

  const role: AppRole | null = session?.role ?? null;

  const menus = useMemo<MenuDefinition[]>(
    () => [
      {
        key: "dashboard",
        href: "/dashboard",
        label: "대시보드",
        activeKey: "dashboard",
        short: "DS",
        description: "오늘의 운영 상태와 핵심 지표",
        section: "overview"
      },
      {
        key: "facilities",
        href: "/facilities",
        label: "시설 현황",
        activeKey: "facilities",
        short: "FH",
        description: "시설 상태와 점검 요약",
        section: "overview"
      },
      {
        key: "facility-management",
        href: "/facility-management",
        label: "시설관리",
        activeKey: "facilityMgmt",
        short: "FM",
        description: "생활실, 안전, 운영 현장 관리",
        section: "operations"
      },
      {
        key: "service-management",
        href: "/service-management",
        label: "서비스관리",
        activeKey: "serviceMgmt",
        short: "SV",
        description: "제공 서비스와 일정 운영 관리",
        section: "operations"
      },
      {
        key: "cases",
        href: "/cases",
        label: "사례관리",
        activeKey: "cases",
        short: "CS",
        description: "사례 흐름과 보호 현황 확인",
        section: "operations"
      },
      {
        key: "child-management",
        href: "/child-management",
        label: "아동관리",
        activeKey: "childMgmt",
        short: "CH",
        description: "아동 기록과 보호 상태 관리",
        section: "people"
      },
      {
        key: "worker-management",
        href: "/worker-management",
        label: "종사자관리",
        activeKey: "workerMgmt",
        short: "WK",
        description: "인력 배치와 담당자 운영 관리",
        section: "people"
      },
      {
        key: "staff",
        href: "/staff",
        label: "직원 관리",
        activeKey: "staff",
        short: "ST",
        description: "직원 정보와 권한 상태 확인",
        section: "people"
      },
      {
        key: "work-schedule",
        href: "/work-schedule",
        label: "일정·근태",
        activeKey: "workSchedule",
        short: "WS",
        description: "일정, 근무, 출결 흐름 관리",
        section: "work"
      },
      {
        key: "approvals",
        href: "/approvals",
        label: "결재 요청",
        activeKey: "approvals",
        short: "AP",
        description: "문서 승인과 결재 대기 처리",
        section: "work"
      },
      {
        key: "documents",
        href: "/documents",
        label: "문서센터",
        activeKey: "documents",
        short: "DC",
        description: "문서 자동화와 자료 작성",
        section: "work"
      },
      {
        key: "board-notice",
        href: "/board/notice",
        label: "공지게시판",
        activeKey: "noticeBoard",
        short: "NO",
        description: "운영 공지와 전달사항 확인",
        section: "work"
      },
      {
        key: "board-tasks",
        href: "/board/tasks",
        label: "업무게시판",
        activeKey: "taskBoard",
        short: "TB",
        description: "실무 업무와 협업 메모 관리",
        section: "work"
      },
      {
        key: "alerts",
        href: "/alerts",
        label: "알림·쪽지",
        activeKey: "alerts",
        short: "AL",
        description: "중요 알림과 커뮤니케이션 확인",
        section: "work"
      },
      {
        key: "audit-logs",
        href: "/audit-logs",
        label: "감사로그",
        activeKey: "auditLogs",
        short: "LG",
        description: "접속 기록과 변경 이력 추적",
        section: "system"
      },
      {
        key: "identity",
        href: "/identity",
        label: "계정·조직도",
        activeKey: "identity",
        short: "ID",
        description: "조직 구조와 계정 정보 관리",
        section: "system"
      }
    ],
    []
  );

  const visibleMenus = useMemo(() => {
    if (!role) return [];
    return menus.filter((menu) => canAccess(role, menu.key));
  }, [menus, role]);

  const groupedMenus = useMemo(() => {
    return Object.keys(sectionMeta).map((section) => ({
      key: section as SectionKey,
      label: sectionMeta[section as SectionKey].label,
      items: visibleMenus.filter((menu) => menu.section === section)
    })).filter((group) => group.items.length > 0);
  }, [visibleMenus]);

  const miniMenus = useMemo(() => visibleMenus.slice(0, 8), [visibleMenus]);

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
    <div
      className={`${styles.shell} ${railOpen ? styles.shellExpanded : ""}`}
      onMouseEnter={() => setRailHover(true)}
      onMouseLeave={() => setRailHover(false)}
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.topRow}>
            <div className={styles.brandMark}>BC</div>
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setRailPinned((prev) => !prev)}
              title={railPinned ? "사이드바 고정 해제" : "사이드바 고정"}
            >
              {railOpen ? "←" : "→"}
            </button>
          </div>

          {railOpen ? (
            <section className={styles.brandPanel}>
              <span className={styles.kicker}>Bomcare Suite</span>
              <h1 className={styles.brandTitle}>새봄 아동복지 운영센터</h1>
              <p className={styles.brandText}>
                사례관리, 생활지원, 문서, 보고 흐름을 한곳에서 정리하는 현대형 운영 플랫폼입니다.
              </p>
              <div className={styles.summaryRow}>
                <span className={styles.summaryChip}>{session.role}</span>
                <span className={styles.summaryChip}>{getDepartmentName(session.departmentId)}</span>
              </div>
            </section>
          ) : (
            <nav className={styles.miniNav}>
              {miniMenus.map((menu) => {
                const isActive = active === menu.activeKey || pathname === menu.href;
                return (
                  <Link
                    key={`mini-${menu.href}`}
                    href={menu.href}
                    className={`${styles.miniLink} ${isActive ? styles.miniLinkActive : ""}`}
                    title={menu.label}
                  >
                    {menu.short}
                  </Link>
                );
              })}
            </nav>
          )}

          {railOpen ? (
            <nav className={styles.navArea}>
              {groupedMenus.map((group) => (
                <section key={group.key} className={styles.section}>
                  <div className={styles.sectionLabel}>{group.label}</div>
                  <div className={styles.sectionLinks}>
                    {group.items.map((menu) => {
                      const isActive = active === menu.activeKey || pathname === menu.href;
                      return (
                        <Link
                          className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                          href={menu.href}
                          key={menu.href}
                        >
                          <span className={styles.navIcon}>{menu.short}</span>
                          <span className={styles.navBody}>
                            <span className={styles.navTitle}>{menu.label}</span>
                            <span className={styles.navDesc}>{menu.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          ) : (
            <div className={styles.hidden} />
          )}

          {railOpen ? (
            <section className={styles.userCard}>
              <div className={styles.userTop}>
                <div className={styles.avatar}>{session.name.slice(0, 1)}</div>
                <div className={styles.userMeta}>
                  <p className={styles.userName}>{session.name}</p>
                  <span className={styles.userMetaText}>{getPositionName(session.positionId)}</span>
                </div>
              </div>

              <div className={styles.userMeta}>
                <span className={styles.userMetaLabel}>Department</span>
                <p className={styles.userMetaText}>{getDepartmentName(session.departmentId)}</p>
                <span className={styles.userMetaLabel}>Role</span>
                <p className={styles.userMetaText}>{session.role}</p>
              </div>

              <div className={styles.userActions}>
                <Link href="/identity" className={styles.primaryGhost}>계정·조직도 열기</Link>
                <button className={styles.logout} type="button" onClick={logout}>로그아웃</button>
              </div>
            </section>
          ) : null}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainInner}>{children}</div>
      </main>
    </div>
  );
}
