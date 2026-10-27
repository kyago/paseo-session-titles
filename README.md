# paseo-session-titles

Paseo 세션 탭 제목을 대화 목적에 맞게 자동으로 바꾸는 플러그인. Paseo 기본 검색·세션 기록에서 찾기 쉽게 하는 게 목적.

- 턴이 끝나면 대화 내용을 보고 제목을 바꾼다(기본 Claude Haiku, 회당 약 $0.001. 설정에서 Claude Code/Codex와 모델 선택). 1·3번째 턴, 이후 10턴마다.
- 제목 문맥: 대화 전체의 사용자 메시지를 처음부터 끝까지 고르게 뽑아(메시지당 150자, 기본 5,000자) 넣는다. 최근 주제로 쏠리지 않게.
- 첫 메시지 뒤에는 AI 마지막 응답 앞부분(500자)도 함께 넣는다. 짧은 첫 요청만으로는 목적이 드러나지 않으므로.
- 이전 자동 제목을 기준으로 주고, 세션 목적이 바뀌었을 때만 새 제목으로 바꾼다(`keep`/`title` 구조화 출력).
- 손으로 바꾼 제목은 건드리지 않는다.
- 설정: Settings → Plugins → session-titles → Options → 참고할 대화 분량(3,000/5,000/8,000/12,000자).
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
