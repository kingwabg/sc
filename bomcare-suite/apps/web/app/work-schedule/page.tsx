"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type EventRow = {
  id: number;
  title: string;
  owner: string;
  date: string;
};

type AttendanceRow = {
  id: number;
  staff: string;
  status: "출근" | "퇴근";
};

type ScheduleStore = {
  events: EventRow[];
  attendance: AttendanceRow[];
};

const STORAGE_KEY = "bomcare:work-schedule:v1";
const initialEvents: EventRow[] = [
  { id: 1, title: "사례회의", owner: "상담팀", date: "2026-03-16" },
  { id: 2, title: "시설 점검", owner: "행정부", date: "2026-03-17" }
];
const initialAttendance: AttendanceRow[] = [
  { id: 1, staff: "한지수", status: "출근" },
  { id: 2, staff: "이주원", status: "퇴근" }
];

export default function WorkSchedulePage() {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [attendance, setAttendance] = useState<AttendanceRow[]>(initialAttendance);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("상담팀");
  const [date, setDate] = useState("2026-03-16");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ScheduleStore;
      if (parsed?.events && parsed?.attendance) {
        setEvents(parsed.events);
        setAttendance(parsed.attendance);
      }
    } catch {
      // ignore invalid local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events, attendance }));
  }, [events, attendance]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    const next: EventRow = { id: Date.now(), title: title.trim(), owner, date };
    setEvents((prev) => [next, ...prev]);
    setTitle("");
    appendAuditLog("일정·근태", `일정 등록: ${next.title} (${next.date})`);
  };

  const toggleAttendance = (id: number) => {
    let changedName = "";
    let changedStatus: AttendanceRow["status"] = "출근";
    setAttendance((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        changedName = row.staff;
        changedStatus = row.status === "출근" ? "퇴근" : "출근";
        return { ...row, status: changedStatus };
      })
    );
    if (changedName) appendAuditLog("일정·근태", `근태 변경: ${changedName} -> ${changedStatus}`);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEvents(initialEvents);
    setAttendance(initialAttendance);
    setTitle("");
    setOwner("상담팀");
    setDate("2026-03-16");
    appendAuditLog("일정·근태", "전체 초기화 실행");
  };

  return (
    <Shell active="workSchedule">
      <section className="page-header">
        <div>
          <p className="eyebrow">일정·근태</p>
          <h2>업무 일정과 종사자 근태를 함께 관리합니다.</h2>
          <p className="muted-copy">일정 등록과 근태 상태 전환을 동시에 보는 운영 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>일정 등록</h3>
            <span>WORK_EVENT</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>일정명<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label>
              담당팀
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="상담팀">상담팀</option>
                <option value="생활지원팀">생활지원팀</option>
                <option value="행정부">행정부</option>
              </select>
            </label>
            <label>일자<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <div className="row-actions">
              <button className="primary-action" type="submit">일정 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>근태 상태</h3>
            <span>ATTENDANCE_LOG</span>
          </div>
          <div className="table-list">
            {attendance.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.staff}</strong>
                  <p>오늘 근무</p>
                </div>
                <button className="ghost-action" type="button" onClick={() => toggleAttendance(row.id)}>
                  {row.status}
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>일정 목록</h3>
          <span>READ</span>
        </div>
        <div className="table-list">
          {events.map((row) => (
            <div className="table-row" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <p>{row.owner}</p>
              </div>
              <span>{row.date}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
