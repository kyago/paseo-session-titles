import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { SessionsScreen } from "./client/sessions-screen";

const SCREEN_ID = "sessions";

function SessionsItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="History"
      active={currentScreen?.screenId === SCREEN_ID}
      onPress={() => openScreen({ screenId: SCREEN_ID })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addScreen({ id: SCREEN_ID, title: "세션 찾기", Component: SessionsScreen }),
    client.addSidebarHeaderItem({ id: "sessions", title: "세션 찾기", Component: SessionsItem }),
    // The way in on iOS and Android, where sidebar header rows may be hidden.
    client.addCommandCenterItem({
      id: "open-sessions",
      title: "세션 찾기",
      icon: "History",
      keywords: ["session", "history", "archive", "restore", "세션", "복구", "검색"],
      context: "global",
      onSelect({ openScreen }) {
        openScreen({ screenId: SCREEN_ID });
      },
    }),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
