import { Shell } from "../../../components/shell";

const permissionRows = [
  ["시설장", "ADMIN", "모든 메뉴 접근, 결재 최종 승인, 권한 부여"],
  ["상담팀장", "COUNSEL_MANAGER", "사례 검토, 상담 기록 승인, 문서 중간 검토"],
  ["상담사", "COUNSELOR", "사례 기록 작성, HWP 초안 작성, 상담 일정 관리"],
  ["생활지도원", "CARE_WORKER", "생활기록 입력, 근무 확인, 시설 점검 기록"],
  ["행정담당", "OFFICE", "공문 관리, 보고서 제출, 정산표 관리"]
];

export default function PermissionsPage() {
  return (
    <Shell active="staff">
      <section className="page-header">
        <div>
          <p className="eyebrow">권한 제어</p>
          <h2>직원 역할별 메뉴와 업무 권한을 조정합니다.</h2>
          <p className="muted-copy">
            ROLE, PERMISSION, STAFF_ROLE, ROLE_PERMISSION 구조를 실제 운영 메뉴에 대응시키는 관리자 전용 화면입니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>역할별 권한 정책</h3>
            <span>정책 기준</span>
          </div>
          <div className="table-list">
            {permissionRows.map(([title, code, detail]) => (
              <div className="table-row" key={code}>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
                <span>{code}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>권한 적용 원칙</h3>
            <span>관리자 설정</span>
          </div>
          <div className="stack-list">
            <div className="stack-item">
              <strong>메뉴 단위 접근 제어</strong>
              <p>대시보드, 사례관리, 문서센터, 결재 요청, 직원 관리 메뉴를 역할별로 분리합니다.</p>
            </div>
            <div className="stack-item">
              <strong>기록 권한과 승인 권한 분리</strong>
              <p>문서 작성과 최종 승인 권한을 분리해 감사 추적이 가능하도록 설계합니다.</p>
            </div>
            <div className="stack-item">
              <strong>기관별 권한 세분화</strong>
              <p>시설 단위로 역할 구성을 다르게 가져갈 수 있도록 확장합니다.</p>
            </div>
          </div>
        </article>
      </section>
    </Shell>
  );
}
