import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** Regenerates the purpose title now, even if the title was set by hand, and resumes auto titles. */
export const retitleSession = defineRpc({
  name: "titles.retitle",
  input: z.object({ agentId: z.string() }),
  output: z.object({ title: z.string().nullable() }),
});
