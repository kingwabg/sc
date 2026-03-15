# AI_CONTEXT.md

이 저장소는 여러 AI/호스트가 동시에 작업할 수 있다.
충돌을 줄이기 위해 아래 규칙을 **작업 시작 전에 반드시 확인**한다.

---

## 1) 작업 시작 전 필수 명령

항상 먼저 최신 상태를 받는다.

```bash
git fetch origin
git pull --rebase origin main
```

### 원칙
- **pull 없이 작업 시작 금지**
- 로컬 커밋이 있으면 `pull --rebase` 기준으로 정리
- push 실패 시 force push 금지
- 원격이 앞서 있으면 다시 fetch/rebase 후 push

---

## 2) 작업 완료 후 규칙

작업 단위가 끝날 때마다 아래 순서로 진행한다.

```bash
git status
git add <changed-files>
git commit -m "type: summary"
git push origin main
```

### 원칙
- 완료 단위마다 **commit + push**
- 한 번에 너무 많은 영역을 묶지 말 것
- 생성 파일/캐시 파일/빌드 산출물은 가능하면 커밋하지 말 것

---

## 3) 현재 협업 원칙

### 기본 원칙
- 다른 AI가 작업 중인 파일은 함부로 수정하지 않는다.
- 공용 레이아웃/공용 스타일 파일은 영향 범위를 먼저 확인한다.
- 가능한 경우 페이지 전용 CSS/module 방식으로 분리한다.
- 작업 중 충돌 가능성이 있으면 먼저 이 파일에 기록한다.

### 권장 분업 방식
- 한 AI = 한 화면 또는 한 기능 묶음
- 공용 파일 수정은 마지막 단계로 모아서 처리
- 여러 AI가 동시에 `main`에 push 중이면 자주 rebase 필요

---

## 4) 기록 전용 섹션

작업 시작 전/도중 아래 항목을 업데이트한다.

### Active Work Areas
- 로그인 (`apps/web/app/login/*`) — done / pushed
- 대시보드 (`apps/web/app/dashboard/*`) — done / pushed
- 사이드바 (`apps/web/components/shell*`) — in progress
- 문서 AI / 템플릿 계열 — other host 작업 중일 수 있음

### Avoid Touching Without Recheck
- `apps/web/components/shell*`
- 문서 AI 관련 API/프롬프트 파일
- 최근 원격 커밋이 들어온 영역

---

## 5) 충돌 발생 시

### 금지
- `git push --force`
- 남의 변경을 확인 없이 덮어쓰기
- rebase 중 충돌 무시하고 계속 진행

### 해야 할 일
1. `git fetch origin`
2. `git log --oneline --left-right main...origin/main`
3. 충돌 파일 확인
4. 누구 작업인지 이 파일에 메모
5. 정리 후 다시 rebase/push

---

## 6) 현재 기준 요약

이 repo는 지금 여러 AI가 병렬로 작업 중이다.
그래서 가장 중요한 규칙은 아래 두 가지다.

1. **작업 시작 전 pull --rebase**
2. **작업 끝나면 바로 push**

이 두 개를 안 지키면 다른 호스트와 바로 어긋난다.
