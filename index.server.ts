import path from "node:path";
import type { PluginLifecycleEvents, PluginServerContext } from "@getpaseo/plugin/server";
import { readAgentRecords } from "./server/agents.ts";
import { generateTitle, paseo } from "./server/cli.ts";
import { paseoHome } from "./server/paseo-home.ts";
import { onTurn, TitleStore, titleContext } from "./server/titles.ts";
import { type Message, readTranscript, transcriptFiles } from "./server/transcript.ts";
import { retitleSession } from "./shared/contracts";

const dataDir = path.join(paseoHome(), "plugin-data");
const stateFile = path.join(dataDir, "session-titles", "titles.json");
const store = new TitleStore(stateFile);
const busy = new Set<string>();

const fromTimeline = (items: PluginLifecycleEvents["agent.turn_ended"]["timeline"]): Message[] =>
  items.flatMap((item) =>
    item.type === "user_message" || item.type === "assistant_message"
      ? [{ role: item.type === "user_message" ? ("user" as const) : ("assistant" as const), text: item.text }]
      : [],
  );

// The hook's agent snapshot can carry the title from before our last rename; the record on disk is current.
const recordOf = async (agentId: string) => (await readAgentRecords()).find((record) => record.id === agentId);

async function messagesFor(sessionId: string | null | undefined, fallback: Message[]): Promise<Message[]> {
  if (!sessionId) return fallback;
  const file = (await transcriptFiles()).get(sessionId) ?? (await transcriptFiles(true)).get(sessionId);
  return file ? await readTranscript(file) : fallback;
}

async function applyTitle(agentId: string, messages: Message[], current: string): Promise<string | null> {
  const title = await generateTitle(titleContext(messages));
  if (title && title !== current) await paseo(["agent", "update", agentId, "--name", title, "--json"]);
  return title;
}

export default function contribute(server: PluginServerContext) {
  server.handle(retitleSession, async ({ agentId }) => {
    const record = await recordOf(agentId);
    if (!record) throw new Error("세션을 찾지 못했습니다.");
    const messages = await messagesFor(record.sessionId, []);
    if (messages.length === 0) throw new Error("대화 기록이 없어 제목을 지을 수 없습니다.");
    const title = await applyTitle(agentId, messages, record.title);
    const state = await store.get(agentId);
    Object.assign(state, { auto: title ?? state.auto, locked: false });
    await store.save();
    return { title };
  });

  const unsubscribe = server.on("agent.turn_ended", async ({ agent, timeline, outcome }) => {
    if (agent.parentAgentId || outcome.kind !== "completed" || busy.has(agent.id)) return;
    busy.add(agent.id);
    try {
      const record = await recordOf(agent.id);
      const current = record?.title ?? agent.title ?? "";
      const state = await store.get(agent.id);
      const messages = await messagesFor(record?.sessionId, fromTimeline(timeline));
      state.first ??= messages.find((message) => message.role === "user")?.text;
      const action = onTurn(state, current, state.first);
      await store.save();
      if (action !== "retitle" || messages.length === 0) return;
      const title = await applyTitle(agent.id, messages, current);
      if (title) {
        state.auto = title;
        await store.save();
      }
    } catch (error) {
      console.error(`[session-titles] title for ${agent.id} failed`, error);
    } finally {
      busy.delete(agent.id);
    }
  });

  return () => {
    unsubscribe();
  };
}
