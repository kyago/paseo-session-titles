import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginScreenProps, usePaseo, useRpc } from "@getpaseo/plugin/client";
import { FlatList, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { restoreSession, retitleSession, searchSessions, type Session } from "../shared/contracts";

type Scope = "all" | "active" | "archived";
type Styles = ReturnType<typeof buildStyles>;
type Navigation = PluginScreenProps["navigation"];

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "active", label: "진행 중" },
  { id: "archived", label: "닫은 세션" },
];

export function SessionsScreen({ theme, layout, navigation }: PluginScreenProps) {
  const styles = useMemo(() => buildStyles(theme, layout.compact), [theme, layout.compact]);
  const search = useRpc(searchSessions);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const sessions = useQuery({ queryKey: ["sessions", query, scope], queryFn: () => search({ query, scope }) });

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.search}
        value={text}
        onChangeText={setText}
        placeholder="제목·대화 내용 검색 (띄어쓰기 = 그리고)"
        placeholderTextColor={theme.colors.foregroundMuted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={styles.row}>
        {SCOPES.map((option) => (
          <Chip key={option.id} label={option.label} on={scope === option.id} onPress={() => setScope(option.id)} styles={styles} />
        ))}
      </View>
      {sessions.error ? <Text style={styles.error}>{String(sessions.error)}</Text> : null}
      <FlatList
        data={sessions.data?.sessions ?? []}
        keyExtractor={(session) => session.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.muted}>{sessions.isLoading ? "찾는 중…" : query ? "일치하는 세션이 없습니다." : "세션이 없습니다."}</Text>
        }
        renderItem={({ item }) => <SessionRow session={item} navigation={navigation} styles={styles} theme={theme} />}
      />
    </View>
  );
}

function SessionRow({ session, navigation, styles, theme }: { session: Session; navigation: Navigation; styles: Styles; theme: PluginTheme }) {
  const paseo = usePaseo();
  const restore = useRpc(restoreSession);
  const retitle = useRpc(retitleSession);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });

  const open = useMutation({
    mutationFn: async (message?: string) => {
      if (session.archived) await restore({ agentId: session.id });
      if (message) await paseo.agents.ref(session.id).send(message);
    },
    onSuccess: () => {
      setComposing(false);
      setPrompt("");
      void refresh();
      if (navigation) navigation.openAgent({ agentId: session.id });
      else toast.show("복구했습니다. 사이드바에서 세션을 여세요.");
    },
    onError: (error) => toast.error(String(error)),
  });
  const rename = useMutation({
    mutationFn: () => retitle({ agentId: session.id }),
    onSuccess: ({ title }) => {
      toast.show(title ? `제목: ${title}` : "제목을 짓지 못했습니다.");
      void refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const start = () => {
    if (session.archived && !session.hasTranscript) toast.show("대화 기록이 지워진 세션이라 빈 대화로 열립니다.");
    open.mutate(undefined);
  };

  return (
    <View style={styles.item}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${session.title} 열기`} onPress={start} disabled={open.isPending}>
        <Text style={styles.title} numberOfLines={2}>
          {session.title || "(제목 없음)"}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {session.project} · {ago(session.lastActivityAt)}
          {session.archived ? " · 닫힘" : ""}
          {session.hasTranscript ? "" : " · 기록 없음"}
        </Text>
        {session.snippet ? (
          <Text style={styles.snippet} numberOfLines={3}>
            {session.snippet}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.row}>
        <Button label={open.isPending ? "여는 중…" : session.archived ? "다시 열기" : "열기"} onPress={start} styles={styles} primary />
        <Button label="이어서…" onPress={() => setComposing((value) => !value)} styles={styles} />
        {session.hasTranscript ? <Button label={rename.isPending ? "짓는 중…" : "제목 다시 짓기"} onPress={() => rename.mutate()} styles={styles} /> : null}
      </View>
      {composing ? (
        <View style={styles.row}>
          <TextInput
            style={[styles.search, styles.grow]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="복구하면서 보낼 메시지"
            placeholderTextColor={theme.colors.foregroundMuted}
            multiline
          />
          <Button label="보내기" onPress={() => prompt.trim() && open.mutate(prompt.trim())} styles={styles} primary />
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, on, onPress, styles }: { label: string; on: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.button, on ? styles.primary : null]}>
      <Text style={[styles.buttonText, on ? styles.primaryText : null]}>{label}</Text>
    </Pressable>
  );
}

function Button({ label, onPress, styles, primary }: { label: string; onPress: () => void; styles: Styles; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, primary ? styles.primary : null]}>
      <Text style={[styles.buttonText, primary ? styles.primaryText : null]}>{label}</Text>
    </Pressable>
  );
}

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.round(hours / 24);
  return days < 60 ? `${days}일 전` : iso.slice(0, 10);
}

function buildStyles(theme: PluginTheme, compact: boolean) {
  const { colors } = theme;
  return {
    screen: { flex: 1, padding: compact ? 12 : 20, gap: 10, backgroundColor: colors.surface0 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.foreground,
      backgroundColor: colors.surface1,
    },
    grow: { flex: 1 },
    row: { flexDirection: "row" as const, flexWrap: "wrap" as const, alignItems: "center" as const, gap: 6 },
    item: { paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { color: colors.foreground, fontSize: compact ? 15 : 16, fontWeight: "600" as const },
    muted: { color: colors.foregroundMuted, fontSize: 12, marginTop: 2 },
    snippet: { color: colors.foregroundMuted, fontSize: 13, marginTop: 4 },
    error: { color: colors.statusDanger },
    button: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface1,
    },
    buttonText: { color: colors.foreground, fontSize: 13 },
    primary: { backgroundColor: colors.accent, borderColor: colors.accent },
    primaryText: { color: colors.accentForeground },
  };
}
