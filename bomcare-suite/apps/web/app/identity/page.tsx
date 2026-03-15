"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "../../components/shell";
import { appendAuditLog } from "../../lib/audit-log";
import {
  AppRole,
  addUser,
  getAllowedMenus,
  getDepartmentName,
  getPositionName,
  getSessionUser,
  getUsers,
  IdentityUser,
  seedDepartments,
  seedPositions
} from "../../lib/identity-store";

export default function IdentityPage() {
  const [rows, setRows] = useState<IdentityUser[]>([]);
  const [name, setName] = useState("신규 담당자");
  const [loginId, setLoginId] = useState("new-user");
  const [password, setPassword] = useState("Welcome!2026");
  const [role, setRole] = useState<AppRole>("STAFF");
  const [departmentId, setDepartmentId] = useState(seedDepartments[0].id);
  const [positionId, setPositionId] = useState(seedPositions[2].id);
  const [notAdmin, setNotAdmin] = useState(false);

  useEffect(() => {
    setRows(getUsers());
    const session = getSessionUser();
    setNotAdmin(session?.role !== "ADMIN");
  }, []);

  const rolePolicies = useMemo(
    (): Array<[AppRole, ReturnType<typeof getAllowedMenus>]> =>
      (["ADMIN", "MANAGER", "STAFF"] as AppRole[]).map((item) => [item, getAllowedMenus(item)]),
    []
  );

  const createUser = () => {
    const next = addUser({
      loginId: loginId.trim(),
      password,
      name: name.trim(),
      role,
      departmentId,
      positionId,
      active: true
    });
    setRows(next);
    appendAuditLog("계정관리", `계정 생성: ${loginId} (${role})`);
  };

  return (
    <Shell active="identity">
      <section className="page-header">
        <div>
          <p className="eyebrow">Identity</p>
          <h2>계정, 조직도, 권한(RBAC)을 한 화면에서 관리합니다.</h2>
          <p className="muted-copy">그룹웨어의 기반이 되는 사용자/부서/직책/역할 정책을 운영에 맞게 구성합니다.</p>
        </div>
      </section>

      {notAdmin ? (
        <section className="panel">
          <div className="stack-item">
            <strong>관리자 전용 화면</strong>
            <p>현재 계정은 조회만 가능합니다. 계정 생성/권한 변경은 ADMIN 계정에서 처리해 주세요.</p>
          </div>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>사용자 관리</h3>
            <span>USER</span>
          </div>
          <form className="editor-form">
            <label>이름<input value={name} onChange={(e) => setName(e.target.value)} disabled={notAdmin} /></label>
            <label>로그인 ID<input value={loginId} onChange={(e) => setLoginId(e.target.value)} disabled={notAdmin} /></label>
            <label>비밀번호<input value={password} onChange={(e) => setPassword(e.target.value)} disabled={notAdmin} /></label>
            <label>
              역할
              <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} disabled={notAdmin}>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="STAFF">STAFF</option>
              </select>
            </label>
            <label>
              부서
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={notAdmin}>
                {seedDepartments.map((row) => (
                  <option value={row.id} key={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label>
              직책
              <select value={positionId} onChange={(e) => setPositionId(e.target.value)} disabled={notAdmin}>
                {seedPositions.map((row) => (
                  <option value={row.id} key={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <div className="row-actions">
              <button className="primary-action" type="button" onClick={createUser} disabled={notAdmin}>계정 추가</button>
            </div>
          </form>
        </article>

        <article className="panel accent">
          <div className="panel-head">
            <h3>조직도(부서/직책)</h3>
            <span>ORG</span>
          </div>
          <div className="stack-list">
            {seedDepartments.map((department) => (
              <div className="stack-item" key={department.id}>
                <strong>{department.name}</strong>
                <p>
                  {rows
                    .filter((row) => row.departmentId === department.id)
                    .map((row) => `${row.name}(${getPositionName(row.positionId)})`)
                    .join(", ") || "배정 인원 없음"}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h3>계정 목록</h3>
          <span>IDENTITY_USER</span>
        </div>
        <div className="table-list">
          {rows.map((row) => (
            <div className="table-row" key={row.id}>
              <div>
                <strong>{row.name} ({row.loginId})</strong>
                <p>{getDepartmentName(row.departmentId)} · {getPositionName(row.positionId)}</p>
              </div>
              <span>{row.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h3>RBAC 정책</h3>
          <span>ROLE_POLICY</span>
        </div>
        <div className="table-list">
          {rolePolicies.map(([policyRole, allowedMenus]) => (
            <div className="table-row" key={policyRole}>
              <div>
                <strong>{policyRole}</strong>
                <p>{allowedMenus.join(", ")}</p>
              </div>
              <span>{allowedMenus.length}개 메뉴</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
