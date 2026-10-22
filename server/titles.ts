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

export function titleContext(messages: Message[]): string {
  const first = messages.find((message) => message.role === "user");
  const recent = messages.slice(-6);
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);
  const lines = recent.map((message) => `${message.role === "user" ? "사용자" : "AI"}: ${clip(message.text.replace(/\s+/g, " "), 300)}`);
  return `[첫 요청]\n${clip(first?.text ?? "", 600)}\n[최근 대화]\n${lines.join("\n")}`;
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
