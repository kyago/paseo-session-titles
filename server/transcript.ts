import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

export interface Message {
  role: "user" | "assistant";
  text: string;
}


const TAGGED = /<(system-reminder|command-[a-z-]+|local-command-[a-z-]+|environment_context|user_instructions)>[\s\S]*?<\/\1>/g;

const clean = (text: string) => text.replace(TAGGED, "").trim();

const textOf = (content: unknown, types: string[]): string | null => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  if (content.some((part) => part?.type === "tool_result")) return null;
  return content.filter((part) => types.includes(part?.type) && typeof part.text === "string").map((part) => part.text).join("\n");
};

/** One transcript line (Claude Code or Codex rollout) as a chat message, or nothing. */
export function parseLine(line: string): Message | null {
  let entry: any;
  try {
    entry = JSON.parse(line);
  } catch {
    return null;
  }
  // Claude Code
  if ((entry?.type === "user" || entry?.type === "assistant") && !entry.isMeta && !entry.isSidechain) {
    const raw = textOf(entry.message?.content, ["text"]);
    const text = raw === null ? "" : clean(raw);
    return text ? { role: entry.type, text } : null;
  }
  // Codex rollout
  const payload = entry?.type === "response_item" ? entry.payload : null;
  if (payload?.type === "message" && (payload.role === "user" || payload.role === "assistant")) {
    const raw = textOf(payload.content, ["input_text", "output_text"]);
    const text = raw === null ? "" : clean(raw);
    return text ? { role: payload.role, text } : null;
  }
  return null;
}

export async function readTranscript(file: string): Promise<Message[]> {
  const messages: Message[] = [];
  const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of lines) {
    const message = parseLine(line);
    if (message) messages.push(message);
  }
  return messages;
}

const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/;
let cache: { at: number; files: Map<string, string> } | null = null;

/** Provider session id → transcript file, for Claude Code projects and uncompressed Codex sessions. */
export async function transcriptFiles(
  fresh = false,
  roots = [path.join(homedir(), ".claude", "projects"), path.join(homedir(), ".codex", "sessions")],
) {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.files;
  const files = new Map<string, string>();
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 5) return;
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else {
        const match = UUID.exec(entry.name);
        if (match) files.set(match[1], full);
      }
    }
  };
  for (const root of roots) await walk(root, 0);
  cache = { at: Date.now(), files };
  return files;
}
