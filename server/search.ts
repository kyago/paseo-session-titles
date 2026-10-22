import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { Session } from "../shared/contracts";
import { type AgentRecord, readAgentRecords } from "./agents.ts";
import { readTranscript, transcriptFiles } from "./transcript.ts";

const run = promisify(execFile);
const LIMIT = 80;

export function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function snippetFor(text: string, words: string[]): string | null {
  const lower = text.toLowerCase();
  if (!words.every((word) => lower.includes(word))) return null;
  const at = lower.indexOf(words[0]);
  const start = Math.max(0, at - 40);
  const flat = text.slice(start, at + 80).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${flat}…`;
}

/** Files that contain the rarest-looking (longest) term, case-insensitively, via grep. */
async function grepFiles(files: string[], word: string): Promise<Set<string>> {
  if (files.length === 0) return new Set();
  try {
    const { stdout } = await run("/usr/bin/grep", ["-l", "-i", "-F", "--", word, ...files], { maxBuffer: 8 * 1024 * 1024 });
    return new Set(stdout.split("\n").filter(Boolean));
  } catch (error: any) {
    if (error?.code === 1) return new Set(); // grep: no match
    throw error;
  }
}

const toSession = (record: AgentRecord, snippet: string | null, hasTranscript: boolean): Session => ({
  id: record.id,
  title: record.title,
  project: path.basename(record.cwd),
  cwd: record.cwd,
  provider: record.provider,
  archived: record.archivedAt !== null,
  lastActivityAt: record.lastActivityAt,
  snippet,
  hasTranscript,
});

export async function searchSessions(query: string, scope: "all" | "active" | "archived"): Promise<Session[]> {
  const [records, files] = await Promise.all([readAgentRecords(), transcriptFiles()]);
  const inScope = records
    .filter((record) => scope === "all" || (scope === "archived") === (record.archivedAt !== null))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  const fileOf = (record: AgentRecord) => (record.sessionId ? files.get(record.sessionId) ?? null : null);
  const words = terms(query);
  if (words.length === 0) return inScope.slice(0, LIMIT).map((record) => toSession(record, null, fileOf(record) !== null));

  const longest = [...words].sort((a, b) => b.length - a.length)[0];
  const candidates = inScope.map(fileOf).filter((file): file is string => file !== null);
  const hits = await grepFiles(candidates, longest);
  const results: Session[] = [];
  for (const record of inScope) {
    if (results.length >= LIMIT) break;
    const file = fileOf(record);
    const titleHit = snippetFor(record.title, words) !== null;
    let snippet: string | null = null;
    if (file && hits.has(file)) {
      const messages = await readTranscript(file);
      for (const message of messages) {
        snippet = snippetFor(message.text, words);
        if (snippet) break;
      }
    }
    if (titleHit || snippet) results.push(toSession(record, snippet, file !== null));
  }
  return results;
}
