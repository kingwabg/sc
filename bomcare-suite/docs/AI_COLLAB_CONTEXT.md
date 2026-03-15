# AI Collaboration Context

이 파일은 여러 AI가 같은 저장소에서 동시에 작업할 때 충돌을 줄이기 위한 공용 문서입니다.

## 1) Mandatory Start Step

모든 AI는 작업 시작 전에 아래를 먼저 실행합니다.

```powershell
git pull --ff-only origin main
git status -sb
```

## 2) Current Ownership

| Area | Owner | Status | Notes |
|---|---|---|---|
| `apps/api` | unassigned | idle | Spring Boot API |
| `apps/web` | unassigned | idle | Next.js UI |
| `docs` | unassigned | active | 협업 규칙/기록 관리 |

## 3) Working Rules

1. 파일 단위 충돌이 예상되면 먼저 이 문서의 `Current Ownership`을 갱신합니다.
2. 같은 파일을 동시에 수정해야 하면, 한 명은 코드 수정/다른 한 명은 테스트/문서로 역할을 분리합니다.
3. 작업 종료 시 `AI_WORKLOG.md`에 반드시 기록합니다.
4. 커밋 전에 다시 `git status -sb`로 불필요 변경이 없는지 확인합니다.

## 4) Handoff Template

```md
### Handoff - YYYY-MM-DD HH:mm (KST)
- Area:
- Files:
- Done:
- Next:
- Risk/Blocker:
```
