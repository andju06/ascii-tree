---
name: commit
description: >-
  커밋을 만들 때 빌드와 린트를 먼저 통과시키고 conventional commit 한글 명사형
  메시지로 커밋한다. 사용자가 /commit, 커밋, commit을 요청할 때 사용한다.
disable-model-invocation: true
---

# Commit

사용자가 커밋을 요청했을 때만 커밋한다. 푸시하지 않는다.

## 절차

1. `git status`, `git diff`, `git log -5`를 병렬로 확인한다.
2. 사용자가 `--no-verify`를 명시한 경우가 아니면 다음을 순서대로 실행한다.
   - `npm run build`. 실패하면 이번 변경이 원인일 때만 고치고 다시 실행한다.
   - 빌드가 통과한 뒤 `npm run lint`.
   - 빌드나 린트가 남으면 커밋하지 않는다. 원인이 이번 변경이 아니면 고치지 말고 멈추고 알린다.
3. 이미 스테이징된 파일이 있으면 그 파일만 커밋한다.
4. 스테이징된 파일이 없으면 이번 커밋에 필요한 파일만 `git add`한다. `.env`, `.env.local`, credentials 파일은 넣지 않는다.
5. diff에 서로 다른 관심사가 있으면 나눠 커밋하는 안을 먼저 제안하고, 사용자가 동의한 뒤 나눈다.
6. 메시지를 아래 형식으로 작성하고 `git commit`한다. 메시지에는 Co-authored-by를 넣지 않는다.
7. `git status`로 커밋 결과를 확인한다.

## 메시지

`<type>: <한글 명사구>`

type은 `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore` 중 하나다. 제목은 72자 이하이고 명사형으로 끝낸다. 추가, 해결, 제거, 개선, 구현, 변경처럼 쓴다. "~한다" 같은 서술형 종결은 쓰지 않는다. 이모지를 쓰지 않는다.

예시:

- `feat: 사용자 인증 시스템 추가`
- `fix: 렌더링 메모리 누수 해결`
- `refactor: 파서 에러 처리 단순화`
