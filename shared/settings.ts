import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const CONTEXT_CHOICES = [3000, 5000, 8000, 12000] as const;

export const titleSettings = defineSettings({
  id: "titles",
  scope: "host",
  version: 1,
  schema: z.object({
    // How much of the session's user messages goes to the title model, in characters.
    contextChars: z.number().int().min(1000).max(20000).default(5000),
  }),
});
