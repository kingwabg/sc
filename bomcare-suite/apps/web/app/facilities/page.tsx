import { Shell } from "../../components/shell";

const rooms = [
  ["생활실 A", "11 / 12명", "야간 인수인계 예정", "안정"],
  ["생활실 B", "9 / 10명", "건강 체크 완료", "안정"],
  ["상담실", "12건 예약", "사례회의 1건 포함", "주의"],
  ["프로그램실", "오후 일정 3건", "외부 강사 방문 예정", "준비"]
];

const checkList = [
  "소방 점검 서명 마감: 오늘 17:00",
  "급식실 냉장 보관 온도 확인 필요",
  "주말 외박 계획서 2건 검토 대기"
];

export default function FacilitiesPage() {
  return (
    <Shell active="facilities">
      <section className="page-header">
        <div>
          <p className="eyebrow">시설 현황</p>
          <h2>공간 운영, 생활실 상태, 점검 일정을 한눈에 봅니다.</h2>
          <p className="muted-copy">
            생활실 사용 현황, 상담실 예약, 시설 점검 항목을 관리자와 생활지도원이 함께 확인할 수 있는 화면입니다.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>공간 운영 현황</h3>
            <span>오늘 기준</span>
          </div>
          <div className="table-list">
            {rooms.map(([name, count, note, state]) => (
              <div className="table-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>{note}</p>
                </div>
                <span>{count} · {state}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>오늘 점검 항목</h3>
            <span>체크 필요</span>
          </div>
          <div className="stack-list">
            {checkList.map((item) => (
              <div className="stack-item" key={item}>
                <strong>{item}</strong>
                <p>담당자가 확인 후 기록을 남길 수 있도록 설계할 예정입니다.</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
