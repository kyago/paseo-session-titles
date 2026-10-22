import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TitleSettingsScreen } from "./client/settings-screen";
import { retitleSession } from "./shared/contracts";

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addSettingsScreen({ id: "titles", title: "설정", icon: "PenLine", Component: TitleSettingsScreen }),
    // `/retitle` names the current session now; Paseo shows any error as a toast.
    client.addSlashCommand({
      name: "retitle",
      description: "이 세션 제목을 대화 내용에 맞게 다시 짓기",
      argumentHint: "",
      context: "agent",
      async onSubmit({ agent, rpc }) {
        await rpc(retitleSession, { agentId: agent.id });
      },
    }),
    client.addCommandCenterItem({
      id: "retitle-session",
      title: "세션 제목 다시 짓기",
      icon: "PenLine",
      keywords: ["title", "rename", "제목", "이름"],
      context: "agent",
      async onSelect({ agent, rpc }) {
        await rpc(retitleSession, { agentId: agent.id });
      },
    }),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
