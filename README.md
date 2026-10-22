# paseo-session-finder

Paseo 세션을 찾고 되살리기 쉽게 만드는 플러그인.

1. **목적에 맞는 제목 자동 갱신**: 턴이 끝나면 대화 내용을 보고 탭 제목을 바꾼다(Claude Haiku, 회당 약 500토큰). 1·3번째 턴, 이후 10턴마다. 손으로 바꾼 제목은 건드리지 않는다.
2. **세션 찾기 화면**: 사이드바·Command Center → "세션 찾기". 닫은 세션 포함, 제목과 대화 내용 전체 검색(띄어쓰기 = 그리고), 일치한 부분 미리보기. 전체/진행 중/닫은 세션 필터.
3. **한 번에 복구**: "다시 열기"(보관 해제 후 열기), "이어서…"(복구하며 메시지 보내기), "제목 다시 짓기".

## 동작 방식

- 세션 목록: `$PASEO_HOME/agents/*/*.json`
- 대화 내용: `~/.claude/projects/**/<sessionId>.jsonl`, `~/.codex/sessions/**`(압축 안 된 것). Hermes 등은 제목만 검색.
- 제목 변경·복구: Paseo CLI(`paseo agent update --name`, `paseo agent reload`)
- 제목 상태: `$PASEO_HOME/plugin-data/session-finder/titles.json`

Claude Code는 `cleanupPeriodDays`(기본 30일)가 지난 대화 기록을 지운다. 그런 세션은 제목으로만 찾을 수 있고 빈 대화로 열린다.

## 설치·개발

```bash
git clone https://github.com/kyago/paseo-session-finder.git
cd paseo-session-finder && npm install
paseo plugin add "$PWD"

npm run typecheck && npm test
paseo plugin reload session-finder
```
