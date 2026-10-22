import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message } from "./transcript.ts";

/** Per-agent bookkeeping: completed turns, the last title we set, and whether a person owns it. */
export interface TitleState {
  turns: number;
  auto?: string;
  locked?: boolean;
  /** First prompt, kept for providers whose transcript we cannot read. */
  first?: string;
}

/** Retitle after the 1st and 3rd turn, then every 10th: early enough to help, rarely enough to stay cheap. */
export const dueAt = (turns: number) => turns === 1 || turns === 3 || turns % 10 === 0;

const norm = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** Paseo names a new agent after its first prompt; anything else was named by a person. */
export function looksAutoNamed(title: string, firstPrompt: string | undefined): boolean {
  if (!title.trim()) return true;
  if (!firstPrompt) return false;
  const head = norm(title).replace(/…$/, "").slice(0, 15);
  return norm(firstPrompt).startsWith(head);
}

/** Decides what a finished turn should do to the title; mutates and returns `state`. */
export function onTurn(state: TitleState, currentTitle: string, firstPrompt: string | undefined): "skip" | "retitle" {
  if (state.locked) return "skip";
  state.turns += 1;
  const ours = state.auto !== undefined ? currentTitle === state.auto : looksAutoNamed(currentTitle, firstPrompt);
  if (!ours) {
    state.locked = true;
    return "skip";
  }
  return dueAt(state.turns) ? "retitle" : "skip";
}

const PER_MESSAGE = 150;
const BUDGET = 3000;

/**
 * The whole session in a fixed budget: the user's messages (where the intent lives) sampled evenly
 * from first to last, plus the previous automatic title as an anchor, so a late detour does not
 * pull the title away from what the session is for.
 */
export function titleContext(messages: Message[], previousTitle?: string): string {
  const clip = (text: string) => {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > PER_MESSAGE ? `${flat.slice(0, PER_MESSAGE)}…` : flat;
  };
  const prompts = messages.filter((message) => message.role === "user").map((message) => clip(message.text));
  const keep = Math.max(2, Math.floor(BUDGET / (PER_MESSAGE + 8)));
  const picked =
    prompts.length <= keep
      ? prompts
      : Array.from({ length: keep }, (_, i) => prompts[Math.round((i * (prompts.length - 1)) / (keep - 1))]);
  const anchor = previousTitle ? `[현재 제목]\n${previousTitle}\n` : "";
  const header = `[사용자 메시지: 전체 ${prompts.length}개 중 ${picked.length}개, 시간순]`;
  return `${anchor}${header}\n${picked.map((text, i) => `${i + 1}. ${text}`).join("\n")}`;
}

export class TitleStore {
  private states: Record<string, TitleState> | null = null;
  private writing = Promise.resolve();
  private readonly file: string;
  constructor(file: string) {
    this.file = file;
  }

  async get(agentId: string): Promise<TitleState> {
    if (!this.states) {
      try {
        this.states = JSON.parse(await readFile(this.file, "utf8"));
      } catch {
        this.states = {};
      }
    }
    this.states![agentId] ??= { turns: 0 };
    return this.states![agentId];
  }

  save(): Promise<void> {
    this.writing = this.writing.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.tmp`;
      await writeFile(temp, JSON.stringify(this.states ?? {}));
      await rename(temp, this.file);
    });
    return this.writing;
  }
}
