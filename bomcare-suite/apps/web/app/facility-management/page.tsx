"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type FacilityRow = {
  id: number;
  name: string;
  kind: string;
  capacity: number;
  status: "운영중" | "점검중";
};

const initialFacilities: FacilityRow[] = [
  { id: 1, name: "새봄 아동센터", kind: "생활시설", capacity: 40, status: "운영중" },
  { id: 2, name: "늘빛 그룹홈", kind: "공동생활가정", capacity: 12, status: "점검중" }
];
const STORAGE_KEY = "bomcare:facility-management:v1";

export default function FacilityManagementPage() {
  const [rows, setRows] = useState<FacilityRow[]>(initialFacilities);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("생활시설");
  const [capacity, setCapacity] = useState("20");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FacilityRow[];
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

    const next: FacilityRow = {
      id: Date.now(),
      name: name.trim(),
      kind,
      capacity: Number(capacity || 0),
      status: "운영중"
    };
    setRows((prev) => [next, ...prev]);
    appendAuditLog("시설관리", `시설 등록: ${next.name}`);
    setName("");
    setCapacity("20");
  };

  const toggleStatus = (id: number) => {
    let changedName = "";
    let changedStatus = "";
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        changedName = item.name;
        changedStatus = item.status === "운영중" ? "점검중" : "운영중";
        return { ...item, status: changedStatus as FacilityRow["status"] };
      })
    );
    if (changedName) {
      appendAuditLog("시설관리", `상태 변경: ${changedName} -> ${changedStatus}`);
    }
  };

  const removeRow = (id: number) => {
    const target = rows.find((item) => item.id === id);
    setRows((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      appendAuditLog("시설관리", `시설 삭제: ${target.name}`);
    }
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialFacilities);
    setName("");
    setKind("생활시설");
    setCapacity("20");
    appendAuditLog("시설관리", "전체 초기화 실행");
  };

  return (
    <Shell active="facilityMgmt">
      <section className="page-header">
        <div>
          <p className="eyebrow">시설관리</p>
          <h2>시설 기본 정보와 운영 상태를 등록하고 관리합니다.</h2>
          <p className="muted-copy">등록, 조회, 상태변경을 먼저 구현한 기능 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>시설 등록</h3>
            <span>CREATE</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              시설명
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="시설명을 입력하세요" />
            </label>
            <label>
              시설유형
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="생활시설">생활시설</option>
                <option value="공동생활가정">공동생활가정</option>
                <option value="상담센터">상담센터</option>
              </select>
            </label>
            <label>
              정원
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">시설 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>시설 목록</h3>
            <span>READ / UPDATE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.kind} · 정원 {row.capacity}명</p>
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
