import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const CONTEXT_CHOICES = [3000, 5000, 8000, 12000] as const;
export const PROVIDERS = ["claude", "codex"] as const;
export type TitleProvider = (typeof PROVIDERS)[number];

export const titleSettings = defineSettings({
  id: "titles",
  scope: "host",
  version: 1,
  schema: z.object({
    // How much of the session's user messages goes to the title model, in characters.
    contextChars: z.number().int().min(1000).max(20000).default(5000),
    // The CLI that writes the titles.
    provider: z.enum(PROVIDERS).default("claude"),
    // A model id or alias for that CLI; empty means its default (haiku for Claude, the CLI's own default for Codex).
    model: z.string().default(""),
  }),
});
