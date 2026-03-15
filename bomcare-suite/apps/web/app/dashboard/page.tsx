import Link from "next/link";
import { Shell } from "../../components/shell";
import styles from "./dashboard.module.css";

const metrics = [
  { title: "보호 아동", value: "38", note: "이번 달 2명 증가", tone: "calm" },
  { title: "긴급 조치", value: "3", note: "즉시 검토 필요", tone: "alert" },
  { title: "오늘 상담", value: "12", note: "상담 일정 가득 참", tone: "focus" },
  { title: "미제출 보고", value: "5", note: "행정 마감 임박", tone: "warn" }
];

const quickActions = [
  {
    tag: "시설운영",
    title: "시설관리 바로가기",
    text: "생활실 상태, 점검 현황, 일일 운영 이슈를 빠르게 확인합니다.",
    href: "/facility-management",
    label: "시설관리 열기"
  },
  {
    tag: "아동지원",
    title: "아동관리 점검",
    text: "사례 흐름, 보호 상태, 최근 업데이트된 아동 기록을 바로 확인합니다.",
    href: "/child-management",
    label: "아동관리 열기"
  },
  {
    tag: "인사/근태",
    title: "근무 및 종사자 현황",
    text: "근무 스케줄과 담당 인력 배치를 한 번에 확인할 수 있습니다.",
    href: "/worker-management",
    label: "종사자관리 열기"
  },
  {
    tag: "문서/결재",
    title: "보고·결재 처리",
    text: "미처리 보고서, 결재 요청, 문서 자동화 작업을 이어서 진행합니다.",
    href: "/approvals",
    label: "결재 요청 보기"
  }
];

const operationsFeed = [
  {
    title: "야간 생활실 점검 보고서 미제출",
    text: "오늘 06:00 기준으로 2개 생활실의 점검 보고서가 아직 제출되지 않았습니다.",
    status: "긴급",
    statusClass: "statusCritical",
    meta: "보고 마감 · 오늘"
  },
  {
    title: "3월 급식 정산 검토 대기",
    text: "회계 검토 전 단계에 머물러 있는 문서가 4건 있습니다. 우선순위 확인이 필요합니다.",
    status: "대기",
    statusClass: "statusPending",
    meta: "행정 처리 · 이번 주"
  },
  {
    title: "신규 상담 일정 등록 완료",
    text: "오늘 신규 상담 3건이 반영되었고 담당자 배정까지 완료되었습니다.",
    status: "안정",
    statusClass: "statusStable",
    meta: "일정 관리 · 방금 전"
  }
];

const focusItems = [
  { title: "결재 대기", text: "승인 대기 문서를 오전 내로 우선 처리하세요.", value: "7건" },
  { title: "시설 점검", text: "이번 주 정기 점검 완료율을 확인하세요.", value: "84%" },
  { title: "알림·쪽지", text: "실무자 미확인 알림을 먼저 정리하세요.", value: "11건" },
  { title: "근태 이슈", text: "보정이 필요한 근태 기록이 남아 있습니다.", value: "2건" }
];

const todayChecklist = [
  { title: "오전 보고 마감", meta: "09:00 ~ 11:00" },
  { title: "시설 정기 점검 확인", meta: "생활실 / 급식 / 안전" },
  { title: "주간 상담 일정 점검", meta: "담당자 배정 포함" }
];

export default function DashboardPage() {
  return (
    <Shell active="dashboard">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>관리자 대시보드</p>
            <h1 className={styles.heroTitle}>오늘 운영 흐름을 한눈에 보고 바로 처리할 수 있게 정리했습니다.</h1>
            <p className={styles.heroText}>
              새봄 아동복지 운영센터의 핵심 업무를 상태 중심으로 재구성했습니다. 지금 필요한 조치, 오늘의
              일정, 주요 운영 지표를 한 화면에서 빠르게 확인할 수 있습니다.
            </p>

            <div className={styles.heroActions}>
              <Link href="/approvals" className={styles.primaryAction}>결재 요청 확인</Link>
              <Link href="/documents" className={styles.secondaryAction}>문서센터 열기</Link>
              <Link href="/work-schedule" className={styles.secondaryAction}>일정·근태 보기</Link>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metaCard}>
                <span className={styles.metaLabel}>오늘 우선 처리</span>
                <strong className={styles.metaValue}>4건</strong>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaLabel}>운영 안정도</span>
                <strong className={styles.metaValue}>보통</strong>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaLabel}>활성 문서 흐름</span>
                <strong className={styles.metaValue}>12건</strong>
              </div>
            </div>
          </div>

          <aside className={styles.heroSide}>
            <div className={styles.sideHeader}>
              <h2 className={styles.sideTitle}>오늘 체크포인트</h2>
              <span className={styles.sideBadge}>오늘 기준</span>
            </div>
            <div className={styles.sideList}>
              {todayChecklist.map((item) => (
                <div key={item.title} className={styles.sideItem}>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
              ))}
            </div>
            <p className={styles.heroNote}>
              긴급 보고, 결재, 일정 확인처럼 빠르게 처리해야 하는 업무를 먼저 올려두는 운영형 대시보드 구조입니다.
            </p>
          </aside>
        </section>

        <section className={styles.metrics}>
          {metrics.map((metric) => (
            <article key={metric.title} className={`${styles.metricCard} ${styles[metric.tone]}`}>
              <span className={styles.metricLabel}>{metric.title}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
              <p className={styles.metricText}>{metric.note}</p>
            </article>
          ))}
        </section>

        <section className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>빠른 업무 이동</h2>
                <p className={styles.panelNote}>실무 흐름으로 곧바로 이동할 수 있도록 핵심 진입점을 재정리했습니다.</p>
              </div>
              <span className={styles.panelBadge}>핵심 모듈</span>
            </div>

            <div className={styles.quickGrid}>
              {quickActions.map((action) => (
                <article key={action.title} className={styles.quickCard}>
                  <span className={styles.quickTag}>{action.tag}</span>
                  <h3 className={styles.quickTitle}>{action.title}</h3>
                  <p className={styles.quickText}>{action.text}</p>
                  <Link href={action.href} className={styles.quickLink}>{action.label}</Link>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.sideColumn}>
            <section className={styles.focusCard}>
              <h2 className={styles.focusTitle}>우선 확인 항목</h2>
              <div className={styles.focusList}>
                {focusItems.map((item) => (
                  <div key={item.title} className={styles.focusItem}>
                    <div>
                      <strong>{item.title}</strong>
                      <p className={styles.focusText}>{item.text}</p>
                    </div>
                    <span className={styles.focusValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>운영 피드</h2>
              <p className={styles.panelNote}>오늘 바로 확인해야 할 상태 변화와 처리 흐름을 시간순으로 정리했습니다.</p>
            </div>
            <span className={styles.panelBadge}>실시간 반영</span>
          </div>

          <div className={styles.feed}>
            {operationsFeed.map((item) => (
              <article key={item.title} className={styles.feedItem}>
                <div className={styles.feedTop}>
                  <strong>{item.title}</strong>
                  <span className={`${styles.feedStatus} ${styles[item.statusClass]}`}>{item.status}</span>
                </div>
                <p className={styles.feedText}>{item.text}</p>
                <span className={styles.feedMeta}>{item.meta}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
