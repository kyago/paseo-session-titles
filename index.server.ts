import path from "node:path";
import type { PluginLifecycleEvents, PluginServerContext } from "@getpaseo/plugin/server";
import { readAgentRecords } from "./server/agents";
import { generateTitle, paseo } from "./server/cli";
import { paseoHome } from "./server/paseo-home";
import { searchSessions as search } from "./server/search";
import { onTurn, TitleStore, titleContext } from "./server/titles";
import { type Message, readTranscript, transcriptFiles } from "./server/transcript";
import { restoreSession, retitleSession, searchSessions } from "./shared/contracts";

const store = new TitleStore(path.join(paseoHome(), "plugin-data", "session-finder", "titles.json"));
const busy = new Set<string>();

const fromTimeline = (items: PluginLifecycleEvents["agent.turn_ended"]["timeline"]): Message[] =>
  items.flatMap((item) =>
    item.type === "user_message" || item.type === "assistant_message"
      ? [{ role: item.type === "user_message" ? ("user" as const) : ("assistant" as const), text: item.text }]
      : [],
  );

async function messagesFor(agentId: string, fallback: Message[]): Promise<Message[]> {
  const record = (await readAgentRecords()).find((candidate) => candidate.id === agentId);
  const sessionId = record?.sessionId;
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
  server.handle(searchSessions, async ({ query, scope }) => ({ sessions: await search(query, scope) }));

  server.handle(restoreSession, async ({ agentId }) => {
    const record = (await readAgentRecords()).find((candidate) => candidate.id === agentId);
    if (!record) throw new Error("세션을 찾지 못했습니다.");
    if (record.archivedAt === null) return { restored: false };
    await paseo(["agent", "reload", agentId, "--json"]);
    return { restored: true };
  });

  server.handle(retitleSession, async ({ agentId }) => {
    const record = (await readAgentRecords()).find((candidate) => candidate.id === agentId);
    if (!record) throw new Error("세션을 찾지 못했습니다.");
    const messages = await messagesFor(agentId, []);
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
      const state = await store.get(agent.id);
      const messages = await messagesFor(agent.id, fromTimeline(timeline));
      state.first ??= messages.find((message) => message.role === "user")?.text;
      const action = onTurn(state, agent.title ?? "", state.first);
      await store.save();
      if (action !== "retitle" || messages.length === 0) return;
      const title = await applyTitle(agent.id, messages, agent.title ?? "");
      if (title) {
        state.auto = title;
        await store.save();
      }
    } catch (error) {
      console.error(`[session-finder] title for ${agent.id} failed`, error);
    } finally {
      busy.delete(agent.id);
    }
  });

  return () => {
    unsubscribe();
  };
}
