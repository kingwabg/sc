"use client";

import { useEffect, useState } from "react";
import { Shell } from "../../components/shell";
import { AuditEntry, clearAuditLogs, getAuditLogs } from "../../lib/audit-log";

const seedLogs: AuditEntry[] = [
  { id: 1, at: "2026-03-16 09:12:00", actor: "한지수", module: "아동관리", action: "김하늘 상태를 상담필요로 변경" },
  { id: 2, at: "2026-03-16 09:25:00", actor: "행정담당", module: "공지게시판", action: "안전점검 공지 등록" },
  { id: 3, at: "2026-03-16 09:40:00", actor: "시설장", module: "결재요청", action: "월간 운영 보고서 승인" }
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const stored = getAuditLogs();
    setLogs(stored.length > 0 ? stored : seedLogs);
  }, []);

  const onClear = () => {
    clearAuditLogs();
    setLogs([]);
  };

  return (
    <Shell active="auditLogs">
      <section className="page-header">
        <div>
          <p className="eyebrow">감사로그</p>
          <h2>누가 언제 어떤 데이터를 변경했는지 추적합니다.</h2>
          <p className="muted-copy">운영 신뢰성과 감사 대응을 위한 변경 이력 화면입니다.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>변경 이력</h3>
          <div className="row-actions">
            <span>AUDIT_LOG</span>
            <button className="ghost-action" type="button" onClick={onClear}>로그 비우기</button>
          </div>
        </div>
        <div className="table-list">
          {logs.length === 0 ? (
            <div className="stack-item">
              <strong>로그가 없습니다.</strong>
              <p>다른 화면에서 등록/변경/삭제를 실행하면 자동으로 누적됩니다.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div className="table-row" key={log.id}>
                <div>
                  <strong>{log.actor} · {log.module}</strong>
                  <p>{log.action}</p>
                </div>
                <span>{log.at}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </Shell>
  );
}
