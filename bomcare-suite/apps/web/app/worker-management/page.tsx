"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";

type WorkerRow = {
  id: number;
  name: string;
  role: string;
  team: string;
  status: "재직" | "휴직";
};

const initialWorkers: WorkerRow[] = [
  { id: 1, name: "한지수", role: "상담사", team: "상담팀", status: "재직" },
  { id: 2, name: "이주원", role: "생활지도원", team: "생활지원팀", status: "재직" }
];
const STORAGE_KEY = "bomcare:worker-management:v1";

export default function WorkerManagementPage() {
  const [rows, setRows] = useState<WorkerRow[]>(initialWorkers);
  const [name, setName] = useState("");
  const [role, setRole] = useState("상담사");
  const [team, setTeam] = useState("상담팀");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WorkerRow[];
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

    const next: WorkerRow = {
      id: Date.now(),
      name: name.trim(),
      role,
      team,
      status: "재직"
    };
    setRows((prev) => [next, ...prev]);
    appendAuditLog("종사자관리", `종사자 등록: ${next.name}`);
    setName("");
  };

  const toggleStatus = (id: number) => {
    let changedName = "";
    let changedStatus = "";
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        changedName = item.name;
        changedStatus = item.status === "재직" ? "휴직" : "재직";
        return { ...item, status: changedStatus as WorkerRow["status"] };
      })
    );
    if (changedName) {
      appendAuditLog("종사자관리", `상태 변경: ${changedName} -> ${changedStatus}`);
    }
  };

  const removeRow = (id: number) => {
    const target = rows.find((item) => item.id === id);
    setRows((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      appendAuditLog("종사자관리", `종사자 삭제: ${target.name}`);
    }
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRows(initialWorkers);
    setName("");
    setRole("상담사");
    setTeam("상담팀");
    appendAuditLog("종사자관리", "전체 초기화 실행");
  };

  return (
    <Shell active="workerMgmt">
      <section className="page-header">
        <div>
          <p className="eyebrow">종사자관리</p>
          <h2>종사자 정보와 근무 상태를 등록하고 관리합니다.</h2>
          <p className="muted-copy">종사자 등록과 재직 상태 전환을 먼저 구현한 기능 화면입니다.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>종사자 등록</h3>
            <span>CREATE</span>
          </div>
          <form className="editor-form" onSubmit={onSubmit}>
            <label>
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="종사자 이름을 입력하세요" />
            </label>
            <label>
              직무
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="상담사">상담사</option>
                <option value="생활지도원">생활지도원</option>
                <option value="행정담당">행정담당</option>
                <option value="시설장">시설장</option>
              </select>
            </label>
            <label>
              팀
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="상담팀">상담팀</option>
                <option value="생활지원팀">생활지원팀</option>
                <option value="행정부">행정부</option>
                <option value="관리부">관리부</option>
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">종사자 등록</button>
              <button className="ghost-action" type="button" onClick={resetAll}>전체 초기화</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>종사자 목록</h3>
            <span>READ / UPDATE</span>
          </div>
          <div className="table-list">
            {rows.map((row) => (
              <div className="table-row" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.role} · {row.team}</p>
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
