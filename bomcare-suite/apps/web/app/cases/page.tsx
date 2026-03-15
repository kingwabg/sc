import { Shell } from "../../components/shell";

const cases = [
  ["김하늘", "정기 상담", "내일 14:00", "상담사 확인"],
  ["박준서", "학교 적응 모니터링", "오늘 16:00", "교사 공유 필요"],
  ["이서윤", "의료 추적", "이번 주", "보호자 연락 예정"]
];

const workflow = [
  "상담 기록 작성",
  "생활지도 메모 연동",
  "외부기관 공유 문서 생성",
  "관리자 검토 요청"
];

const childProfile = {
  name: "김하늘",
  room: "생활실 A",
  school: "새봄중학교 2학년",
  risk: "관찰 필요",
  lastNote: "학교 적응 스트레스 관련 추가 상담 필요"
};

export default function CasesPage() {
  return (
    <Shell active="cases">
      <section className="page-header">
        <div>
          <p className="eyebrow">사례관리</p>
          <h2>아동별 상담, 생활기록, 외부기관 공유 흐름을 연결합니다.</h2>
          <p className="muted-copy">
            사례관리 화면은 상담사와 관리자 모두가 같은 정보를 보되, 기록과 검토 흐름을 분리해서 다루도록 설계합니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>진행 중 사례</h3>
            <span>우선 순위 기준</span>
          </div>
          <div className="table-list">
            {cases.map(([name, topic, due, status]) => (
              <div className="table-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>{topic} · {status}</p>
                </div>
                <span>{due}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>기록 흐름</h3>
            <span>설계 초안</span>
          </div>
          <div className="stack-list">
            {workflow.map((item) => (
              <div className="stack-item" key={item}>
                <strong>{item}</strong>
                <p>업무 단계별로 저장, 검토, 공유 권한을 나누는 구조를 적용할 예정입니다.</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel accent">
          <div className="panel-head">
            <h3>아동 사례 카드</h3>
            <span>상세 보기 목업</span>
          </div>
          <div className="stack-list">
            <div className="stack-item">
              <strong>{childProfile.name}</strong>
              <p>{childProfile.school}</p>
            </div>
            <div className="stack-item">
              <strong>생활실</strong>
              <p>{childProfile.room}</p>
            </div>
            <div className="stack-item">
              <strong>현재 상태</strong>
              <p>{childProfile.risk}</p>
            </div>
            <div className="stack-item">
              <strong>최근 메모</strong>
              <p>{childProfile.lastNote}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>사례 타임라인</h3>
            <span>최근 기록</span>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <strong>오늘 09:20</strong>
              <p>생활지도원이 등교 전 컨디션 메모를 기록했습니다.</p>
            </div>
            <div className="timeline-item">
              <strong>어제 16:00</strong>
              <p>상담 담당자가 학교 적응 관련 상담을 진행했습니다.</p>
            </div>
            <div className="timeline-item">
              <strong>3월 12일</strong>
              <p>외부기관 공유용 사례 요약 문서 초안이 생성되었습니다.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="action-strip">
        <a className="primary-action" href="/cases/child-profile">아동 상세 프로필 보기</a>
        <a className="ghost-action" href="/documents/hwp-writer">사례 문서 작성 흐름 보기</a>
      </section>
    </Shell>
  );
}
