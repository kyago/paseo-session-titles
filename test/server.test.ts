import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { sanitizeTitle } from "../server/cli.ts";
import { looksAutoNamed, onTurn, type TitleState } from "../server/titles.ts";
import { parseLine, readTranscript, transcriptFiles } from "../server/transcript.ts";

const line = (value: unknown) => JSON.stringify(value);

test("parseLine keeps chat text and drops tool noise", () => {
  assert.deepEqual(parseLine(line({ type: "user", message: { content: "청약 갱신해줘<system-reminder>x</system-reminder>" } })), { role: "user", text: "청약 갱신해줘" });
  assert.equal(parseLine(line({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } })), null);
  assert.equal(parseLine(line({ type: "user", isMeta: true, message: { content: "meta" } })), null);
  assert.deepEqual(
    parseLine(line({ type: "assistant", message: { content: [{ type: "thinking", thinking: "hm" }, { type: "text", text: "완료" }] } })),
    { role: "assistant", text: "완료" },
  );
  assert.deepEqual(
    parseLine(line({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "codex 질문" }] } })),
    { role: "user", text: "codex 질문" },
  );
  assert.equal(parseLine("not json"), null);
});

test("transcript files map session ids and read in order", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sf-"));
  const id = "11111111-2222-4333-8444-555555555555";
  await mkdir(path.join(root, "-Users-me-repo"));
  const file = path.join(root, "-Users-me-repo", `${id}.jsonl`);
  await writeFile(file, [line({ type: "user", message: { content: "첫 요청" } }), line({ type: "assistant", message: { content: [{ type: "text", text: "답" }] } })].join("\n"));
  const files = await transcriptFiles(true, [root]);
  assert.equal(files.get(id), file);
  assert.deepEqual((await readTranscript(file)).map((m) => m.text), ["첫 요청", "답"]);
});

test("title ownership and schedule", () => {
  assert.equal(looksAutoNamed("로그인 버그 좀 봐줘", "로그인 버그 좀 봐줘 (샘플 앱)"), true);
  assert.equal(looksAutoNamed("할 일 목록 정리", "로그인 버그 좀 봐줘"), false);

  const state: TitleState = { turns: 0 };
  assert.equal(onTurn(state, "로그인 버그 좀 봐줘", "로그인 버그 좀 봐줘"), "retitle"); // turn 1
  state.auto = "로그인 리다이렉트 오류";
  assert.equal(onTurn(state, "로그인 리다이렉트 오류", undefined), "skip"); // turn 2
  assert.equal(onTurn(state, "로그인 리다이렉트 오류", undefined), "retitle"); // turn 3
  assert.equal(onTurn(state, "내가 바꾼 제목", undefined), "skip"); // renamed by hand
  assert.equal(state.locked, true);
  assert.equal(onTurn(state, "내가 바꾼 제목", undefined), "skip");
});

test("sanitizeTitle trims model chatter", () => {
  assert.equal(sanitizeTitle('"로그인 리다이렉트 오류 수정".\n설명'), "로그인 리다이렉트 오류 수정");
  assert.equal(sanitizeTitle("제목: 청약 알림"), "청약 알림");
  assert.equal(sanitizeTitle("  "), null);
  assert.equal(sanitizeTitle("가".repeat(40))?.length, 30);
});
