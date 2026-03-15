import { Shell } from "../../../components/shell";

const approvalLines = [
  ["1단계", "상담팀장 박민아", "검토 중"],
  ["2단계", "행정담당 이서진", "대기"],
  ["3단계", "시설장 김도현", "최종 승인 예정"]
];

const documentFields = [
  ["문서명", "아동 사례관리 보고서"],
  ["문서 유형", "HWP"],
  ["기안자", "상담사 한지수"],
  ["연계 아동", "김하늘"]
];

export default function ApprovalRequestDetailPage() {
  return (
    <Shell active="approvals">
      <section className="page-header">
        <div>
          <p className="eyebrow">결재 상세</p>
          <h2>결재 요청 1건의 문서 정보와 승인 단계를 함께 봅니다.</h2>
          <p className="muted-copy">
            문서 메타데이터와 결재선, 상태 이력을 한 화면에서 확인하는 상세 화면 목업입니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>문서 정보</h3>
            <span>GENERATED_DOCUMENT</span>
          </div>
          <div className="stack-list">
            {documentFields.map(([name, value]) => (
              <div className="stack-item" key={name}>
                <strong>{name}</strong>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>결재선</h3>
            <span>APPROVAL_STEP</span>
          </div>
          <div className="timeline">
            {approvalLines.map(([step, owner, state]) => (
              <div className="timeline-item" key={step}>
                <strong>{step} · {owner}</strong>
                <p>{state}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
