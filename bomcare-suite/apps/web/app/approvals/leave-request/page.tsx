"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "../../../components/shell";
import { appendAuditLog } from "../../../lib/audit-log";
import { appendApproval, ApprovalItem } from "../../../lib/approval-store";

function nowLabel(): string {
  return new Date().toLocaleString("ko-KR", { hour12: false });
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const [drafter, setDrafter] = useState("한지수");
  const [reviewer, setReviewer] = useState("박민아 팀장");
  const [leaveType, setLeaveType] = useState("연차");
  const [startDate, setStartDate] = useState("2026-03-21");
  const [endDate, setEndDate] = useState("2026-03-21");
  const [reason, setReason] = useState("개인 사유");

  const submit = (draft: boolean) => {
    const item: ApprovalItem = {
      id: Date.now(),
      formType: "휴가신청서",
      title: `${leaveType} 신청 - ${drafter}`,
      drafter,
      reviewer,
      leaveType,
      startDate,
      endDate,
      reason,
      status: draft ? "임시저장" : "결재대기",
      createdAt: nowLabel()
    };
    appendApproval(item);
    appendAuditLog("전자결재", `${draft ? "임시저장" : "결재상신"}: ${item.title}`);
    router.push("/approvals");
  };

  return (
    <Shell active="approvals">
      <section className="page-header">
        <div>
          <p className="eyebrow">휴가 신청서</p>
          <h2>전자결재 기본 템플릿: 휴가 신청</h2>
          <p className="muted-copy">MVP 기준으로 휴가 신청 1종 양식부터 정확히 동작하게 구성했습니다.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>신청서 입력</h3>
          <span>APPROVAL_FORM</span>
        </div>
        <form className="editor-form">
          <label>기안자<input value={drafter} onChange={(e) => setDrafter(e.target.value)} /></label>
          <label>검토자<input value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></label>
          <label>
            휴가 종류
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="연차">연차</option>
              <option value="반차">반차</option>
              <option value="병가">병가</option>
              <option value="공가">공가</option>
            </select>
          </label>
          <label>시작일<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>종료일<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          <label>사유<textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <div className="row-actions">
            <button className="ghost-action" type="button" onClick={() => submit(true)}>임시저장</button>
            <button className="primary-action" type="button" onClick={() => submit(false)}>결재상신</button>
          </div>
        </form>
      </section>
    </Shell>
  );
}
