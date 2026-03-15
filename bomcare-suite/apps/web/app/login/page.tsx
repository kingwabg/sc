"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate, setSessionUser } from "../../lib/identity-store";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("admin");
  const [password, setPassword] = useState("Admin!2026");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const session = authenticate(loginId.trim(), password);
    if (!session) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    setSessionUser(session);
    router.push("/dashboard");
  };

  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">직원 로그인</p>
          <h1>로그인 후 그룹웨어 메뉴를 역할별로 확인하세요.</h1>
          <p>
            이 화면은 계정/조직도/RBAC MVP와 연결되어 있습니다. 로그인하면 권한(ADMIN, MANAGER, STAFF)에 맞는
            메뉴만 사이드바에 표시됩니다.
          </p>

          <div className="stack-list">
            <div className="stack-item">
              <strong>관리자</strong>
              <p>admin / Admin!2026</p>
            </div>
            <div className="stack-item">
              <strong>팀장</strong>
              <p>manager / Manager!2026</p>
            </div>
            <div className="stack-item">
              <strong>실무자</strong>
              <p>worker / Worker!2026</p>
            </div>
          </div>
        </div>

        <article className="auth-card">
          <div>
            <p className="eyebrow">Login</p>
            <h2>운영 시스템 접속</h2>
            <p className="muted-copy">아이디와 비밀번호를 입력해 접속하세요.</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label>
              아이디
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            </label>
            <label>
              비밀번호
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <p className="muted-copy">{error}</p> : null}
            <button type="submit">로그인</button>
          </form>
        </article>
      </section>
    </main>
  );
}
