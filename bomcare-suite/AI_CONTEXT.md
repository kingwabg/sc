# AI_CONTEXT.md

여러 AI가 같은 저장소에서 동시에 작업할 때 쓰는 공통 컨텍스트 파일입니다.

## 공통 작업 지시문 (복붙용)

작업 시작 전에 아래 순서대로 진행해줘.

1. repo 최신 상태 먼저 반영
```bash
git status
git pull --ff-only origin main
```

2. 아래 파일 먼저 읽어
- `bomcare-suite/README.md`
- `bomcare-suite/AI_CONTEXT.md`

3. 작업 시작 전에 `AI_CONTEXT.md`에 네 작업 항목 먼저 기록해
- 시간
- 작업 내용
- 건드릴 파일
- 상태(`planned` / `in-progress`)

4. 작업 끝나면 `AI_CONTEXT.md` 업데이트해
- 실제 변경 파일
- 작업 결과 요약
- handoff note(있으면)

주의:
- 다른 AI가 이미 잡은 파일은 되도록 피해서 작업
- 충돌 가능하면 먼저 `AI_CONTEXT.md` 기준으로 조정
- 작업 전에 반드시 최신 pull 하고 시작

## 짧은 버전 (복붙용)

- 먼저 `git status && git pull --ff-only origin main`
- `bomcare-suite/README.md`, `bomcare-suite/AI_CONTEXT.md` 읽기
- 작업 시작 전에 `AI_CONTEXT.md`에 작업 범위/파일/상태 기록
- 작업 끝나면 changed files / notes 업데이트
- 다른 AI가 잡은 파일과 충돌 안 나게 진행

## Active Ownership

| Area | Owner | Status | Target Files |
|---|---|---|---|
| `apps/api` | unassigned | idle | - |
| `apps/web` | unassigned | idle | - |
| `docs` | codex | in-progress | `README.md`, `AI_CONTEXT.md` |

## Entry Template

```markdown
### YYYY-MM-DD HH:mm (KST) - <agent>
- Status: planned | in-progress | done
- Task:
- Target files:
- Changed files:
- Result:
- Handoff note:
```

## Work Log

### 2026-03-16 04:56 (KST) - codex
- Status: done
- Task: multi-AI 공통 규칙 문서화
- Target files:
  - `README.md`
  - `AI_CONTEXT.md`
- Changed files:
  - `README.md`
  - `AI_CONTEXT.md`
- Result:
  - 작업 전 `git pull --ff-only origin main` 규칙 명시
  - 공통 지시문/짧은 버전/기록 템플릿 정리
- Handoff note:
  - 다음 작업자는 시작 전에 Ownership 갱신 후 작업 시작
