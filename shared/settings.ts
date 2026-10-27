import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const CONTEXT_CHOICES = [3000, 5000, 8000, 12000] as const;
// Claude CLI aliases for the latest model of each tier.
export const MODEL_CHOICES = ["haiku", "sonnet", "opus", "fable"] as const;

export const titleSettings = defineSettings({
  id: "titles",
  scope: "host",
  version: 1,
  schema: z.object({
    // How much of the session's user messages goes to the title model, in characters.
    contextChars: z.number().int().min(1000).max(20000).default(5000),
    // The model that writes the titles.
    model: z.enum(MODEL_CHOICES).default("haiku"),
  }),
});
