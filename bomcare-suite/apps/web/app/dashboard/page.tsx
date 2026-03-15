import { Shell } from "../../components/shell";

const metrics = [
  { title: "보호 아동", value: "38", note: "이번 달 +2명", tone: "calm" },
  { title: "긴급 조치", value: "3", note: "즉시 확인 필요", tone: "alert" },
  { title: "오늘 상담", value: "12", note: "상담 일정 가득 참", tone: "focus" },
  { title: "미제출 보고", value: "5", note: "행정 마감 임박", tone: "warn" }
];

const trendRows = [
  ["보호 아동 변동", "+2", "최근 30일"],
  ["상담 완료율", "91%", "이번 주"],
  ["문서 확인 지연", "2건", "오늘 기준"],
  ["시설 점검 완료", "84%", "주간 진행률"]
];

export default function DashboardPage() {
  return (
    <Shell active="dashboard">
      <section className="page-header">
        <div>
          <p className="eyebrow">관리자 대시보드</p>
          <h2>늘봄 아동복지 운영센터 현황</h2>
          <p className="muted-copy">실무 운영 기능으로 바로 이동할 수 있도록 핵심 모듈을 정리했습니다.</p>
        </div>
        <div className="header-chip">운영 기능 연결 완료</div>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.title} className={`metric-card ${metric.tone}`}>
            <span>{metric.title}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="action-strip">
        <a className="primary-action" href="/facility-management">시설관리</a>
        <a className="ghost-action" href="/child-management">아동관리</a>
        <a className="ghost-action" href="/worker-management">종사자관리</a>
        <a className="ghost-action" href="/service-management">서비스관리</a>
      </section>

      <section className="action-strip">
        <a className="primary-action" href="/board/notice">공지게시판</a>
        <a className="ghost-action" href="/board/tasks">업무게시판</a>
        <a className="ghost-action" href="/work-schedule">일정/근태</a>
        <a className="ghost-action" href="/alerts">알림/쪽지</a>
        <a className="ghost-action" href="/audit-logs">감사로그</a>
        <a className="ghost-action" href="/identity">계정/조직도</a>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>운영 추이 요약</h3>
          <span>주간 비교</span>
        </div>
        <div className="table-list">
          {trendRows.map(([title, value, period]) => (
            <div className="table-row" key={title}>
              <div>
                <strong>{title}</strong>
                <p>{period}</p>
              </div>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
