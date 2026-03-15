"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type AlertRow = {
  id: number;
  target: string;
  message: string;
  read: boolean;
};

const STORAGE_KEY = "bomcare:alerts:v1";
const initialRows: AlertRow[] = [
  { id: 1, target: "상담팀", message: "사례회의 1시간 전 알림", read: false },
  { id: 2, target: "행정부", message: "월간 보고서 제출 마감 안내", read: true }
];

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>(initialRows);
  const [target, setTarget] = useState("상담팀");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AlertRow[];
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
    if (!message.trim()) return;
    const next: AlertRow = { id: Date.now(), target, message: message.trim(), read: false };
    setRows((prev) => [next, ...prev]);
    setMessage("");
    appendAuditLog("알림·쪽지", `알림 발송: ${target} / ${next.message}`);
  };

  const toggleRead = (id: number) => {
    let changedMessage = "";
    let changedRead = false;
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        changedMessage = row.message;
        changedRead = !row.read;
        return { ...row, read: !row.read };
      })
    );
    if (changedMessage) {
      appendAuditLog("알림·쪽지", `읽음 변경: ${changedMessage} -> ${changedRead ? "읽음" : "미읽음"}`);
    }
  };

  const removeRow = (id: number) => {
    const targetRow = rows.find((row) => row.id === id);
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (targetRow) appendAuditLog("알림·쪽지", `알림 삭제: ${targetRow.message}`);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialRows);
    setTarget("상담팀");
    setMessage("");
    appendAuditLog("알림·쪽지", "전체 초기화 실행");
  };

  return (
    <Shell active="alerts">
      <section className="page-header">
        <div>
          <p className="eyebrow">알림·쪽지</p>
          <h2>팀별 알림과 쪽지를 발송하고 읽음 상태를 관리합니다.</h2>
          <p className="muted-copy">메시지 생성, 읽음 전환, 삭제를 처리하는 운영 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>알림 발송</h3>
            <span>ALERT_MESSAGE</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              수신 대상
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="상담팀">상담팀</option>
                <option value="생활지원팀">생활지원팀</option>
                <option value="행정부">행정부</option>
              </select>
            </label>
            <label>
              메시지
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">알림 발송</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>알림 목록</h3>
            <span>READ / UPDATE / DELETE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.target}</strong>
                  <p>{row.message}</p>
                </div>
                <div className="row-actions">
                  <button className="ghost-action" type="button" onClick={() => toggleRead(row.id)}>
                    {row.read ? "읽음" : "미읽음"}
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
