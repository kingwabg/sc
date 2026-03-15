"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate, setSessionUser } from "../../lib/identity-store";
import styles from "./login.module.css";

const demoAccounts = [
  { label: "관리자", value: "admin / Admin!2026" },
  { label: "팀장", value: "manager / Manager!2026" },
  { label: "실무자", value: "worker / Worker!2026" }
];

const highlights = [
  { label: "권한 기반", value: "RBAC", text: "로그인 후 역할별로 필요한 메뉴만 노출됩니다." },
  { label: "문서 흐름", value: "HWP + XLSX", text: "문서 자동화와 제출 흐름을 한곳에서 연결합니다." },
  { label: "운영 집중", value: "Daily Ops", text: "시설 운영, 보고, 결재 업무를 빠르게 처리할 수 있게 구성합니다." }
];

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
    <main className={styles.page}>
      <section className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>직원 로그인</p>
            <h1 className={styles.heroTitle}>운영 업무에 바로 들어갈 수 있게, 로그인 경험부터 정리합니다.</h1>
            <p className={styles.heroText}>
              Bomcare Suite는 아동복지시설 운영을 위한 업무 플랫폼입니다. 계정 권한에 따라 필요한 화면만
              보여주고, 문서·보고·시설 운영 흐름이 하나의 리듬으로 이어지도록 설계합니다.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {highlights.map((item) => (
              <article key={item.label} className={styles.featureCard}>
                <span className={styles.featureLabel}>{item.label}</span>
                <strong className={styles.featureValue}>{item.value}</strong>
                <p className={styles.featureText}>{item.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.noteBox}>
            <strong className={styles.noteTitle}>로그인 화면 개선 방향</strong>
            <p className={styles.noteText}>
              소개용 문구와 실제 접속 행동을 분리해서, 첫 화면은 신뢰감 있게 보이고 입력 흐름은 더 빠르게
              처리되도록 정리했습니다.
            </p>
          </div>
        </section>

        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <p className={styles.eyebrow}>Login</p>
            <h2 className={styles.cardTitle}>운영 시스템 접속</h2>
            <p className={styles.helper}>아이디와 비밀번호를 입력하면 권한에 맞는 메뉴가 자동으로 구성됩니다.</p>
          </header>

          <div className={styles.demoBox}>
            <strong className={styles.demoTitle}>데모 계정</strong>
            {demoAccounts.map((account) => (
              <div key={account.label} className={styles.demoItem}>
                <span className={styles.demoKey}>{account.label}</span>
                <span className={styles.demoValue}>{account.value}</span>
              </div>
            ))}
          </div>

          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              <span className={styles.label}>아이디</span>
              <input
                className={styles.input}
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>비밀번호</span>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button className={styles.submit} type="submit">
              로그인
            </button>
          </form>

          <p className={styles.footerNote}>
            현재는 데모용 계정 예시가 노출되어 있으며, 추후 실서비스 단계에서는 보안 정책에 맞게 별도 처리할 수
            있습니다.
          </p>
        </article>
      </section>
    </main>
  );
}
