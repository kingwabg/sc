import { Shell } from "../../components/shell";

const templates = [
  ["아동 사례관리 보고서", "HWP", "기관 제출용 표준 양식"],
  ["생활기록 주간 점검표", "XLSX", "생활지원과 상담 기록을 한 번에 정리"],
  ["보조금 집행 현황", "XLSX", "행정 제출 전 검토용 정산 서식"]
];

export default function DocumentsPage() {
  return (
    <Shell active="documents">
      <section className="page-header">
        <div>
          <p className="eyebrow">문서센터</p>
          <h2>HWP와 스프레드시트 흐름을 한곳에서 관리합니다.</h2>
          <p className="muted-copy">
            공문 제출용 한글 문서와 운영 정산용 스프레드시트를 같은 흐름 안에서 다루기 위한 시작 화면입니다.
          </p>
        </div>
      </section>

      <section className="action-strip">
        <a href="/documents/journal-minutes" className="primary-action">일지·회의록 관리</a>
        <a href="/documents/hwp-writer" className="primary-action">HWP 문서 작성</a>
        <button type="button" className="ghost-action">정산표 내려받기</button>
        <button type="button" className="ghost-action">결재 요청 보내기</button>
      </section>

      <section className="document-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>문서 템플릿</h3>
            <span>기본 세트</span>
          </div>
          <div className="stack-list">
            {templates.map(([name, type, note]) => (
              <div className="stack-item" key={name}>
                <div className="inline-meta">
                  <strong>{name}</strong>
                  <span>{type}</span>
                </div>
                <p>{note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>연동 상태</h3>
            <span>초기 설계</span>
          </div>
          <div className="stack-list">
            <div className="stack-item">
              <strong>HWP 템플릿 엔진</strong>
              <p>기관 양식에 맞춘 자동 문서 생성 예정</p>
            </div>
            <div className="stack-item">
              <strong>스프레드시트 연동</strong>
              <p>업로드, 검증, 다운로드 중심으로 준비 중</p>
            </div>
            <div className="stack-item">
              <strong>결재 흐름</strong>
              <p>관리자 승인과 이력 추적을 위한 문서 큐 설계 중</p>
            </div>
          </div>
        </article>
      </section>
    </Shell>
  );
}
