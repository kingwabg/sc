"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type ServiceRow = {
  id: number;
  title: string;
  category: string;
  target: string;
  status: "운영중" | "중단";
};

const initialServices: ServiceRow[] = [
  { id: 1, title: "심리상담 지원", category: "상담", target: "중학생", status: "운영중" },
  { id: 2, title: "학습 멘토링", category: "교육", target: "초등 고학년", status: "운영중" }
];
const STORAGE_KEY = "bomcare:service-management:v1";

export default function ServiceManagementPage() {
  const [rows, setRows] = useState<ServiceRow[]>(initialServices);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("상담");
  const [target, setTarget] = useState("중학생");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ServiceRow[];
      if (Array.isArray(parsed)) {
        setRows(parsed);
      }
    } catch {
      // ignore invalid local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;

    const next: ServiceRow = {
      id: Date.now(),
      title: title.trim(),
      category,
      target,
      status: "운영중"
    };
    setRows((prev) => [next, ...prev]);
    appendAuditLog("서비스관리", `서비스 등록: ${next.title}`);
    setTitle("");
  };

  const toggleStatus = (id: number) => {
    let changedTitle = "";
    let changedStatus = "";
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        changedTitle = item.title;
        changedStatus = item.status === "운영중" ? "중단" : "운영중";
        return { ...item, status: changedStatus as ServiceRow["status"] };
      })
    );
    if (changedTitle) {
      appendAuditLog("서비스관리", `상태 변경: ${changedTitle} -> ${changedStatus}`);
    }
  };

  const removeRow = (id: number) => {
    const target = rows.find((item) => item.id === id);
    setRows((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      appendAuditLog("서비스관리", `서비스 삭제: ${target.title}`);
    }
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialServices);
    setTitle("");
    setCategory("상담");
    setTarget("중학생");
    appendAuditLog("서비스관리", "전체 초기화 실행");
  };

  return (
    <Shell active="serviceMgmt">
      <section className="page-header">
        <div>
          <p className="eyebrow">서비스관리</p>
          <h2>시설 내 프로그램 서비스와 운영 상태를 관리합니다.</h2>
          <p className="muted-copy">서비스 등록과 상태 전환을 먼저 구현한 기능 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>서비스 등록</h3>
            <span>CREATE</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              서비스명
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="서비스명을 입력하세요" />
            </label>
            <label>
              분류
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="상담">상담</option>
                <option value="교육">교육</option>
                <option value="자립">자립</option>
                <option value="의료">의료</option>
              </select>
            </label>
            <label>
              대상
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="초등 저학년">초등 저학년</option>
                <option value="초등 고학년">초등 고학년</option>
                <option value="중학생">중학생</option>
                <option value="고등학생">고등학생</option>
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">서비스 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>서비스 목록</h3>
            <span>READ / UPDATE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.title}</strong>
                  <p>{row.category} · 대상 {row.target}</p>
                </div>
                <div className="row-actions">
                  <button className="ghost-action" type="button" onClick={() => toggleStatus(row.id)}>
                    {row.status}
                  </button>
                  <button className="x-action" type="button" onClick={() => removeRow(row.id)}>
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
