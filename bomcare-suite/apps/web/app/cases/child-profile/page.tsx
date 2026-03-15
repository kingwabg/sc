import { Shell } from "../../../components/shell";

const guardians = [
  ["주 보호자", "이은정", "010-2234-8891", "월 2회 면담"],
  ["후견 기관", "서울시 아동보호팀", "02-555-1200", "분기 보고 대상"]
];

const medications = [
  ["비타민D", "아침 식후", "복용 중"],
  ["알레르기 약", "증상 시", "관찰 필요"]
];

const schoolNotes = [
  "담임교사와 주 1회 적응 상황 공유",
  "최근 지각 없음, 교우관계 안정",
  "시험 기간 중 불안 반응 관찰 필요"
];

export default function ChildProfilePage() {
  return (
    <Shell active="cases">
      <section className="page-header">
        <div>
          <p className="eyebrow">아동 상세 프로필</p>
          <h2>김하늘 아동의 생활, 상담, 보호자 정보를 한 흐름으로 봅니다.</h2>
          <p className="muted-copy">
            아동 기본 정보, 보호자 연락, 복약 상태, 학교 메모를 같은 화면에서 다루는 상세 보기 목업입니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel accent">
          <div className="panel-head">
            <h3>기본 정보</h3>
            <span>CHILD</span>
          </div>
          <div className="stack-list">
            <div className="stack-item">
              <strong>이름</strong>
              <p>김하늘 / 새봄중학교 2학년</p>
            </div>
            <div className="stack-item">
              <strong>현재 생활실</strong>
              <p>생활실 A / 보호 상태 정상</p>
            </div>
            <div className="stack-item">
              <strong>관찰 메모</strong>
              <p>학교 적응 스트레스 관련 추가 상담이 필요합니다.</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>보호자 및 연계기관</h3>
            <span>관계 정보</span>
          </div>
          <div className="table-list">
            {guardians.map(([type, name, phone, note]) => (
              <div className="table-row" key={type + name}>
                <div>
                  <strong>{type} · {name}</strong>
                  <p>{note}</p>
                </div>
                <span>{phone}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>복약 정보</h3>
            <span>확장 후보</span>
          </div>
          <div className="table-list">
            {medications.map(([name, timing, state]) => (
              <div className="table-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>{timing}</p>
                </div>
                <span>{state}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>학교 공유 메모</h3>
            <span>학교 연계</span>
          </div>
          <div className="stack-list">
            {schoolNotes.map((note) => (
              <div className="stack-item" key={note}>
                <strong>{note}</strong>
                <p>추후 학교 협력 기록 테이블로 분리할 수 있습니다.</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
