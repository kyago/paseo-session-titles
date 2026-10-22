# paseo-session-titles

Paseo 세션 탭 제목을 대화 목적에 맞게 자동으로 바꾸는 플러그인. Paseo 기본 검색·세션 기록에서 찾기 쉽게 하는 게 목적.

- 턴이 끝나면 대화 내용을 보고 제목을 바꾼다(Claude Haiku, 회당 약 500토큰). 1·3번째 턴, 이후 10턴마다.
- 손으로 바꾼 제목은 건드리지 않는다.
- `/retitle` 또는 Command Center "세션 제목 다시 짓기": 지금 세션 제목을 바로 다시 짓고, 그 세션의 자동 제목을 다시 켠다.

## 동작 방식

- 현재 제목·세션 ID: `$PASEO_HOME/agents/*/*.json`
- 대화 내용: `~/.claude/projects/**/<sessionId>.jsonl`, `~/.codex/sessions/**`. 그 외 제공자는 끝난 턴의 내용.
- 제목 변경: `paseo agent update <id> --name <제목>`
- 상태: `$PASEO_HOME/plugin-data/session-titles/titles.json`

## 설치·개발

```bash
git clone https://github.com/kyago/paseo-session-titles.git
cd paseo-session-titles && npm install
paseo plugin add "$PWD"

npm run typecheck && npm test
paseo plugin reload session-titles
```
