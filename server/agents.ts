import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paseoHome } from "./paseo-home.ts";

export interface AgentRecord {
  id: string;
  title: string;
  provider: string;
  cwd: string;
  workspaceId: string | null;
  archivedAt: string | null;
  lastActivityAt: string;
  sessionId: string | null;
}

/** Every agent the daemon has persisted, archived ones included, read from `$PASEO_HOME/agents`. */
export async function readAgentRecords(home = paseoHome()): Promise<AgentRecord[]> {
  const root = path.join(home, "agents");
  const records: AgentRecord[] = [];
  for (const dir of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!dir.isDirectory()) continue;
    for (const file of await readdir(path.join(root, dir.name)).catch(() => [])) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = JSON.parse(await readFile(path.join(root, dir.name, file), "utf8"));
        if (raw.internal || raw.parentAgentId) continue;
        records.push({
          id: raw.id,
          title: raw.title ?? "",
          provider: raw.provider ?? "",
          cwd: raw.cwd ?? "",
          workspaceId: raw.workspaceId ?? null,
          archivedAt: raw.archivedAt ?? null,
          lastActivityAt: raw.lastActivityAt ?? raw.updatedAt ?? raw.createdAt ?? "",
          sessionId: raw.persistence?.sessionId ?? null,
        });
      } catch {
        // A file the daemon is rewriting right now; the next search reads it.
      }
    }
  }
  return records;
}
