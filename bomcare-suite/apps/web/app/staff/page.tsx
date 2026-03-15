import { Shell } from "../../components/shell";

const staffRows = [
  ["한지수", "상담사", "상담팀", "활성"],
  ["박민아", "상담팀장", "상담팀", "활성"],
  ["김도현", "시설장", "관리부", "활성"],
  ["이주원", "생활지도원", "생활지원팀", "야간근무"]
];

const roles = [
  ["ADMIN", "시설 운영, 권한 관리, 결재 승인"],
  ["COUNSELOR", "상담 기록, 사례관리, 문서 초안 작성"],
  ["CARE_WORKER", "생활기록, 교대 확인, 시설 점검 기록"],
  ["OFFICE", "행정 문서, 보고서, 제출 일정 관리"]
];

export default function StaffPage() {
  return (
    <Shell active="staff">
      <section className="page-header">
        <div>
          <p className="eyebrow">직원 관리</p>
          <h2>직원, 역할, 권한 구조를 기관 운영 방식에 맞게 관리합니다.</h2>
          <p className="muted-copy">
            ROLE, PERMISSION, STAFF_ROLE 구조를 기준으로 관리자와 실무자의 접근 범위를 분리하기 위한 화면입니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>직원 현황</h3>
            <span>STAFF</span>
          </div>
          <div className="table-list">
            {staffRows.map(([name, role, team, status]) => (
              <div className="table-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>{role} · {team}</p>
                </div>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>역할과 권한</h3>
            <span>ROLE / PERMISSION</span>
          </div>
          <div className="stack-list">
            {roles.map(([name, detail]) => (
              <div className="stack-item" key={name}>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="action-strip">
        <a className="primary-action" href="/staff/permissions">권한 제어 화면 보기</a>
        <a className="ghost-action" href="/approvals">결재 흐름 확인</a>
      </section>
    </Shell>
  );
}
