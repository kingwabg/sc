"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../../components/shell";
import { appendAuditLog } from "../../../lib/audit-log";

type TaskRow = {
  id: number;
  title: string;
  assignee: string;
  status: "진행중" | "완료";
};

const STORAGE_KEY = "bomcare:task-board:v1";
const initialRows: TaskRow[] = [
  { id: 1, title: "주간 사례회의 자료 준비", assignee: "상담팀", status: "진행중" },
  { id: 2, title: "생활실 A 점검 보고 업로드", assignee: "생활지원팀", status: "완료" }
];

export default function TaskBoardPage() {
  const [rows, setRows] = useState<TaskRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("상담팀");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TaskRow[];
      if (Array.isArray(parsed)) setRows(parsed);
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
    const next: TaskRow = { id: Date.now(), title: title.trim(), assignee, status: "진행중" };
    setRows((prev) => [next, ...prev]);
    setTitle("");
    appendAuditLog("업무게시판", `업무 등록: ${next.title}`);
  };

  const toggleStatus = (id: number) => {
    let changedTitle = "";
    let changedStatus: TaskRow["status"] = "진행중";
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        changedTitle = row.title;
        changedStatus = row.status === "진행중" ? "완료" : "진행중";
        return { ...row, status: changedStatus };
      })
    );
    if (changedTitle) appendAuditLog("업무게시판", `상태 변경: ${changedTitle} -> ${changedStatus}`);
  };

  const removeRow = (id: number) => {
    const target = rows.find((row) => row.id === id);
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (target) appendAuditLog("업무게시판", `업무 삭제: ${target.title}`);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialRows);
    setTitle("");
    setAssignee("상담팀");
    appendAuditLog("업무게시판", "전체 초기화 실행");
  };

  return (
    <Shell active="taskBoard">
      <section className="page-header">
        <div>
          <p className="eyebrow">업무게시판</p>
          <h2>팀별 업무를 등록하고 완료 상태를 추적합니다.</h2>
          <p className="muted-copy">업무 생성, 상태 전환, 삭제를 즉시 처리하는 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>업무 등록</h3>
            <span>TASK_POST</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              업무 제목
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 제목을 입력하세요" />
            </label>
            <label>
              담당팀
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="상담팀">상담팀</option>
                <option value="생활지원팀">생활지원팀</option>
                <option value="행정부">행정부</option>
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">업무 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>업무 목록</h3>
            <span>READ / UPDATE / DELETE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.title}</strong>
                  <p>{row.assignee}</p>
                </div>
                <div className="row-actions">
                  <button className="ghost-action" type="button" onClick={() => toggleStatus(row.id)}>
                    {row.status}
                  </button>
                  <button className="x-action" type="button" onClick={() => removeRow(row.id)}>X</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
