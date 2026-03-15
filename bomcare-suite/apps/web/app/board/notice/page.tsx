"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../../components/shell";
import { appendAuditLog } from "../../../lib/audit-log";

type NoticeRow = {
  id: number;
  title: string;
  writer: string;
  pinned: boolean;
};

const STORAGE_KEY = "bomcare:notice-board:v1";
const initialRows: NoticeRow[] = [
  { id: 1, title: "3월 시설 안전점검 일정 공지", writer: "행정담당", pinned: true },
  { id: 2, title: "상담실 예약 정책 변경 안내", writer: "상담팀장", pinned: false }
];

export default function NoticeBoardPage() {
  const [rows, setRows] = useState<NoticeRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [writer, setWriter] = useState("행정담당");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as NoticeRow[];
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
    const next: NoticeRow = { id: Date.now(), title: title.trim(), writer, pinned: false };
    setRows((prev) => [next, ...prev]);
    setTitle("");
    appendAuditLog("공지게시판", `공지 등록: ${next.title}`);
  };

  const togglePin = (id: number) => {
    let changedTitle = "";
    let changedState = false;
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        changedTitle = row.title;
        changedState = !row.pinned;
        return { ...row, pinned: !row.pinned };
      })
    );
    if (changedTitle) {
      appendAuditLog("공지게시판", `고정 상태 변경: ${changedTitle} -> ${changedState ? "고정" : "해제"}`);
    }
  };

  const removeRow = (id: number) => {
    const target = rows.find((row) => row.id === id);
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (target) appendAuditLog("공지게시판", `공지 삭제: ${target.title}`);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialRows);
    setTitle("");
    setWriter("행정담당");
    appendAuditLog("공지게시판", "전체 초기화 실행");
  };

  return (
    <Shell active="noticeBoard">
      <section className="page-header">
        <div>
          <p className="eyebrow">공지게시판</p>
          <h2>시설 운영 공지사항을 등록하고 고정합니다.</h2>
          <p className="muted-copy">공지 등록, 상단 고정, 삭제 흐름을 바로 쓰는 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>공지 등록</h3>
            <span>NOTICE_POST</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              제목
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목을 입력하세요" />
            </label>
            <label>
              작성자
              <select value={writer} onChange={(e) => setWriter(e.target.value)}>
                <option value="행정담당">행정담당</option>
                <option value="상담팀장">상담팀장</option>
                <option value="시설장">시설장</option>
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">공지 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>공지 목록</h3>
            <span>READ / UPDATE / DELETE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.pinned ? "[고정] " : ""}{row.title}</strong>
                  <p>{row.writer}</p>
                </div>
                <div className="row-actions">
                  <button className="ghost-action" type="button" onClick={() => togglePin(row.id)}>
                    {row.pinned ? "고정해제" : "고정"}
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
