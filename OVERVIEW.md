Session Finder makes past Paseo chat sessions easy to find and bring back.

- Purpose titles: when a turn finishes, the plugin renames the session after what it is about, using Claude Haiku on the daemon machine (about 500 tokens per title). It retitles after the 1st and 3rd turns and every 10th after that. A title you set by hand is never changed.
- Search: a "세션 찾기" screen (sidebar and Command Center) lists every session, closed ones included. It searches titles and the full conversation text of Claude Code and uncompressed Codex transcripts on the daemon machine, with a snippet of the match.
- Restore: one tap reopens a closed session, optionally sending a first message.

Requires Paseo 0.12 or later and the Claude Code CLI on the daemon machine for titles. Claude Code deletes transcripts older than its `cleanupPeriodDays` setting (30 days by default); such sessions can only be found by title and reopen without history.
