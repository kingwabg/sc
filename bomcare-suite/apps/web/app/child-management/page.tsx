"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type ChildRow = {
  id: number;
  name: string;
  room: string;
  grade: string;
  state: "보호중" | "상담필요";
};

const initialChildren: ChildRow[] = [
  { id: 1, name: "김하늘", room: "생활실 A", grade: "중2", state: "상담필요" },
  { id: 2, name: "박준서", room: "생활실 B", grade: "중1", state: "보호중" }
];
const STORAGE_KEY = "bomcare:child-management:v1";

export default function ChildManagementPage() {
  const [rows, setRows] = useState<ChildRow[]>(initialChildren);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("생활실 A");
  const [grade, setGrade] = useState("초6");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChildRow[];
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
    if (!name.trim()) return;

    const next: ChildRow = {
      id: Date.now(),
      name: name.trim(),
      room,
      grade,
      state: "보호중"
    };
    setRows((prev) => [next, ...prev]);
    appendAuditLog("아동관리", `아동 등록: ${next.name}`);
    setName("");
  };

  const toggleState = (id: number) => {
    let changedName = "";
    let changedState = "";
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        changedName = item.name;
        changedState = item.state === "보호중" ? "상담필요" : "보호중";
        return { ...item, state: changedState as ChildRow["state"] };
      })
    );
    if (changedName) {
      appendAuditLog("아동관리", `상태 변경: ${changedName} -> ${changedState}`);
    }
  };

  const removeRow = (id: number) => {
    const target = rows.find((item) => item.id === id);
    setRows((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      appendAuditLog("아동관리", `아동 삭제: ${target.name}`);
    }
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialChildren);
    setName("");
    setRoom("생활실 A");
    setGrade("초6");
    appendAuditLog("아동관리", "전체 초기화 실행");
  };

  return (
    <Shell active="childMgmt">
      <section className="page-header">
        <div>
          <p className="eyebrow">아동관리</p>
          <h2>아동 기본 정보와 상태를 등록하고 관리합니다.</h2>
          <p className="muted-copy">입소 아동 등록과 상태 전환을 먼저 구현한 기능 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>아동 등록</h3>
            <span>CREATE</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="아동 이름을 입력하세요" />
            </label>
            <label>
              생활실
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                <option value="생활실 A">생활실 A</option>
                <option value="생활실 B">생활실 B</option>
                <option value="생활실 C">생활실 C</option>
              </select>
            </label>
            <label>
              학년
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="초6">초6</option>
                <option value="중1">중1</option>
                <option value="중2">중2</option>
                <option value="중3">중3</option>
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">아동 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>아동 목록</h3>
            <span>READ / UPDATE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.room} · {row.grade}</p>
                </div>
                <div className="row-actions">
                  <button className="ghost-action" type="button" onClick={() => toggleState(row.id)}>
                    {row.state}
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
