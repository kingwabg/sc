"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";
import { ApprovalItem, ApprovalStatus, getApprovals, resetApprovals, updateApprovalStatus } from "../../lib/approval-store";

function statusBadge(status: ApprovalStatus): string {
  if (status === "완료") return "승인완료";
  if (status === "반려") return "반려";
  if (status === "결재대기") return "결재대기";
  return "임시저장";
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<ApprovalItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApprovalStatus>("ALL");

  useEffect(() => {
    setRows(getApprovals());
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((row) => (statusFilter === "ALL" ? true : row.status === statusFilter)),
    [rows, statusFilter]
  );

  const changeStatus = (id: number, status: ApprovalStatus) => {
    const target = rows.find((row) => row.id === id);
    const next = updateApprovalStatus(id, status);
    setRows(next);
    if (target) {
      appendAuditLog("전자결재", `상태 변경: ${target.title} -> ${status}`);
    }
  };

  const reset = () => {
    const next = resetApprovals();
    setRows(next);
    setStatusFilter("ALL");
    appendAuditLog("전자결재", "결재 목록을 초기값으로 재설정");
  };

  return (
    <Shell active="approvals">
      <section className="page-header">
        <div>
          <p className="eyebrow">전자결재</p>
          <h2>휴가 신청서를 기준으로 결재 흐름을 관리합니다.</h2>
          <p className="muted-copy">
            임시저장, 결재대기, 반려, 완료 상태를 실시간으로 전환할 수 있는 기본 전자결재 화면입니다.
          </p>
        </div>
      </section>

      <section className="action-strip">
        <Link className="primary-action" href="/approvals/leave-request">휴가 신청서 작성</Link>
        <button className="ghost-action" type="button" onClick={reset}>결재목록 초기화</button>
      </section>

      <section className="action-strip">
        <button className="ghost-action" type="button" onClick={() => setStatusFilter("ALL")}>전체</button>
        <button className="ghost-action" type="button" onClick={() => setStatusFilter("임시저장")}>임시저장</button>
        <button className="ghost-action" type="button" onClick={() => setStatusFilter("결재대기")}>결재대기</button>
        <button className="ghost-action" type="button" onClick={() => setStatusFilter("반려")}>반려</button>
        <button className="ghost-action" type="button" onClick={() => setStatusFilter("완료")}>완료</button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>결재 문서 목록</h3>
          <span>APPROVAL_REQUEST</span>
        </div>
        <div className="table-list">
          {filteredRows.map((row) => (
            <div className="table-row" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <p>{row.drafter} · {row.formType} · {row.startDate} ~ {row.endDate}</p>
              </div>
              <div className="row-actions">
                <span>{statusBadge(row.status)}</span>
                <Link className="ghost-action" href={`/approvals/request-detail/${row.id}`}>상세</Link>
                <button className="ghost-action" type="button" onClick={() => changeStatus(row.id, "결재대기")}>상신</button>
                <button className="ghost-action" type="button" onClick={() => changeStatus(row.id, "완료")}>승인</button>
                <button className="ghost-action" type="button" onClick={() => changeStatus(row.id, "반려")}>반려</button>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 ? (
            <div className="stack-item">
              <strong>표시할 문서가 없습니다.</strong>
              <p>상태 필터를 변경하거나 새 결재 문서를 등록해 주세요.</p>
            </div>
          ) : null}
        </div>
      </section>
    </Shell>
  );
}
