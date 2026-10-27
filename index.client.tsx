import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import type { PluginAgentCommandContext, PluginButtonIconProps, PluginClientContext } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { TitleSettingsScreen } from "./client/settings-screen";
import { retitleSession } from "./shared/contracts";

type Toast = ReturnType<typeof useToast>;
// Paseo renders one sidebar item per plugin across hosts, so the toast is shared through globalThis.
const shared = globalThis as { __paseoSessionTitlesToast?: Toast };

/** Renders nothing; it only hands Paseo's toast (a hook) to the commands, which run outside React. */
function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    shared.__paseoSessionTitlesToast = toast;
    return () => {
      if (shared.__paseoSessionTitlesToast === toast) delete shared.__paseoSessionTitlesToast;
    };
  }, [toast]);
  return null;
}

const Spinner = ({ color }: PluginButtonIconProps) => <ActivityIndicator size="small" color={color} />;

export default function contribute(client: PluginClientContext) {
  const running = new Set<string>();

  // Progress and result as a toast; Paseo shows a thrown error as a toast, replacing the progress one.
  // Without the sidebar mounted (no toast yet), a pill above the session's composer shows progress instead.
  async function retitle({ agent, rpc }: PluginAgentCommandContext) {
    if (running.has(agent.id)) return;
    running.add(agent.id);
    const toast = shared.__paseoSessionTitlesToast;
    toast?.show("세션 제목 짓는 중…", { variant: "info", durationMs: 120_000 });
    const pill = toast
      ? null
      : client.addComposerPill({
          id: "retitle-progress",
          workspaceId: agent.workspaceId,
          agentId: agent.id,
          button: { title: "세션 제목 짓는 중", label: "제목 짓는 중…", icon: Spinner, disabled: true, behavior: { kind: "action", onPress() {} } },
        });
    try {
      const { title } = await rpc(retitleSession, { agentId: agent.id });
      const message = title ? `세션 제목: ${title}` : "제목을 짓지 못했습니다";
      toast?.show(message, { variant: title ? "success" : "warning" });
      pill?.update({ icon: "Check", label: message });
    } finally {
      setTimeout(() => {
        pill?.remove();
        running.delete(agent.id);
      }, pill ? 4000 : 0);
    }
  }

  const removers = [
    client.addSettingsScreen({ id: "titles", title: "Options", icon: "PenLine", Component: TitleSettingsScreen }),
    client.addSidebarFooterItem({ id: "toast-bridge", title: "세션 제목 알림", Component: ToastBridge }),
    client.addSlashCommand({
      name: "retitle",
      description: "이 세션 제목을 대화 내용에 맞게 다시 짓기",
      argumentHint: "",
      context: "agent",
      onSubmit: retitle,
    }),
    client.addCommandCenterItem({
      id: "retitle-session",
      title: "세션 제목 다시 짓기",
      icon: "PenLine",
      keywords: ["title", "rename", "제목", "이름"],
      context: "agent",
      onSelect: retitle,
    }),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
