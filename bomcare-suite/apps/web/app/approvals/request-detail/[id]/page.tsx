"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Shell } from "../../../../components/shell";
import { findApproval } from "../../../../lib/approval-store";

type Params = {
  params: {
    id: string;
  };
};

export default function ApprovalRequestDetailByIdPage({ params }: Params) {
  const numericId = Number(params.id);
  const approval = useMemo(() => findApproval(numericId), [numericId]);

  return (
    <Shell active="approvals">
      <section className="page-header">
        <div>
          <p className="eyebrow">결재 상세</p>
          <h2>요청 문서 상세 정보</h2>
          <p className="muted-copy">문서별 결재 상태와 결재 라인을 확인합니다.</p>
        </div>
      </section>

      {!approval ? (
        <section className="panel">
          <div className="stack-item">
            <strong>문서를 찾을 수 없습니다.</strong>
            <p>결재 목록으로 돌아가서 다시 선택해 주세요.</p>
            <Link className="primary-action" href="/approvals">결재 목록으로</Link>
          </div>
        </section>
      ) : (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-head">
              <h3>문서 정보</h3>
              <span>APPROVAL_REQUEST #{approval.id}</span>
            </div>
            <div className="stack-list">
              <div className="stack-item"><strong>문서명</strong><p>{approval.title}</p></div>
              <div className="stack-item"><strong>양식</strong><p>{approval.formType}</p></div>
              <div className="stack-item"><strong>기안자</strong><p>{approval.drafter}</p></div>
              <div className="stack-item"><strong>검토자</strong><p>{approval.reviewer}</p></div>
              <div className="stack-item"><strong>휴가 기간</strong><p>{approval.startDate} ~ {approval.endDate}</p></div>
              <div className="stack-item"><strong>상태</strong><p>{approval.status}</p></div>
              <div className="stack-item"><strong>사유</strong><p>{approval.reason}</p></div>
            </div>
          </article>

          <article className="panel accent">
            <div className="panel-head">
              <h3>결재 라인</h3>
              <span>APPROVAL_STEP</span>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <strong>1단계 · 기안</strong>
                <p>{approval.drafter} / 완료</p>
              </div>
              <div className="timeline-item">
                <strong>2단계 · 검토</strong>
                <p>{approval.reviewer} / {approval.status === "결재대기" ? "진행중" : approval.status}</p>
              </div>
              <div className="timeline-item">
                <strong>3단계 · 최종</strong>
                <p>시설장 / {approval.status === "완료" ? "완료" : "대기"}</p>
              </div>
            </div>
          </article>
        </section>
      )}
    </Shell>
  );
}
