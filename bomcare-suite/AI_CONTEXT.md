# AI_CONTEXT.md

이 프로젝트는 여러 AI/호스트가 동시에 작업할 수 있다.
작업 충돌을 줄이기 위해 **작업 시작 전 이 파일을 먼저 읽고**, 아래 순서를 반드시 따른다.

---

## 작업 시작 전 필수 순서

1. repo 최신 상태 먼저 반영

```bash
git status
git pull --ff-only origin main
```

2. 아래 파일 먼저 읽기
- `bomcare-suite/README.md`
- `bomcare-suite/AI_CONTEXT.md`

3. 작업 시작 전에 이 파일에 네 작업 항목 먼저 기록
- 시간
- 작업 내용
- 건드릴 파일
- 상태 (`planned` / `in-progress`)

4. 작업 끝나면 이 파일 업데이트
- 실제 변경 파일
- 작업 결과 요약
- handoff note 있으면 같이 기록

---

## 공통 규칙

- 다른 AI가 이미 잡은 파일은 되도록 피해서 작업한다.
- 충돌 가능하면 먼저 `AI_CONTEXT.md` 기준으로 조정한다.
- 작업 전에 반드시 최신 pull 하고 시작한다.
- 작업 단위가 끝나면 **commit + push** 한다.
- force push 금지.
- 원격이 앞서 있으면 다시 pull/rebase 후 push 한다.

---

## 권장 작업 종료 순서

```bash
git status
git add <changed-files>
git commit -m "type: summary"
git push origin main
```

---

## Active Work Areas

- 로그인 (`apps/web/app/login/*`) — done / pushed
- 대시보드 (`apps/web/app/dashboard/*`) — done / pushed
- 사이드바 (`apps/web/components/shell*`) — in progress
- 문서 AI / 템플릿 계열 — other host 작업 중일 수 있음

---

## Avoid Touching Without Recheck

- `apps/web/components/shell*`
- 문서 AI 관련 API/프롬프트 파일
- 최근 원격 커밋이 들어온 영역

---

## Work Log

아래에 작업 entry를 추가한다.

### Entry Template

```markdown
- Time:
- Agent/Host:
- Status: planned | in-progress | done
- Task:
- Target files:
- Notes / handoff:
```

### Current Entries

- Time: 2026-03-16 04:46 KST
- Agent/Host: OpenClaw main / DESKTOP-PPGTQQM
- Status: in-progress
- Task: dashboard sidebar compact usability pass
- Target files:
  - `apps/web/components/shell.tsx`
  - `apps/web/components/shell.module.css`
- Notes / handoff:
  - 로그인/대시보드 1차 개편 완료
  - 여러 호스트가 동시에 `main`에 push 중이므로 작업 전 `git pull --ff-only origin main` 필수
