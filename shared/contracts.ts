import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  project: z.string(),
  cwd: z.string(),
  provider: z.string(),
  archived: z.boolean(),
  lastActivityAt: z.string(),
  snippet: z.string().nullable(),
  hasTranscript: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

export const searchSessions = defineRpc({
  name: "sessions.search",
  input: z.object({ query: z.string(), scope: z.enum(["all", "active", "archived"]) }),
  output: z.object({ sessions: z.array(sessionSchema) }),
});

/** Un-archives an agent and reloads its provider session; a no-op for an active agent. */
export const restoreSession = defineRpc({
  name: "sessions.restore",
  input: z.object({ agentId: z.string() }),
  output: z.object({ restored: z.boolean() }),
});

/** Regenerates the purpose title now, even if the title was set by hand. */
export const retitleSession = defineRpc({
  name: "sessions.retitle",
  input: z.object({ agentId: z.string() }),
  output: z.object({ title: z.string().nullable() }),
});
