import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">2026 아동복지 운영 플랫폼</p>
          <h1>아동복지시설의 운영, 보고, 공문 업무를 한 화면으로 정리합니다.</h1>
          <p>
            Bomcare Suite는 아동 사회복지시설을 위한 차세대 업무 플랫폼입니다. 관리자 대시보드,
            HWP 문서 흐름, 스프레드시트 정산, 시설 현황 관리까지 하나의 흐름으로 이어집니다.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="primary-action">로그인 화면 보기</Link>
            <Link href="/dashboard" className="ghost-action">대시보드 바로 보기</Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stat-card">
            <span>현재 보호 아동</span>
            <strong>38명</strong>
            <p>오늘 기준 생활실 배치 반영</p>
          </div>
          <div className="stat-card warm">
            <span>문서 자동화 범위</span>
            <strong>HWP + XLSX</strong>
            <p>행정 제출 양식과 정산 서식 대응</p>
          </div>
          <div className="stat-card muted">
            <span>실시간 반영 중</span>
            <strong>5건</strong>
            <p>우선 확인이 필요한 보고 업무</p>
          </div>
        </div>
      </section>
    </main>
  );
}
