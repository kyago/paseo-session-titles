import { useEffect, useState } from "react";
import { usePaseo, useSettings } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsRow, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import { CONTEXT_CHOICES, PROVIDERS, type TitleProvider, titleSettings } from "../shared/settings";

const DEFAULT_LABEL: Record<TitleProvider, string> = { claude: "기본 (haiku)", codex: "기본 (Codex 기본 모델)" };

/** The models this host's daemon knows for the provider, so the list stays current without plugin updates. */
function useModels(provider: TitleProvider): { label: string; value: string }[] {
  const paseo = usePaseo();
  const [models, setModels] = useState<{ label: string; value: string }[]>([]);
  useEffect(() => {
    let live = true;
    setModels([]);
    paseo.providers
      .listModels(provider)
      .then((result) => live && setModels((result.models ?? []).map((model) => ({ label: model.label, value: model.id }))))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [paseo, provider]);
  return models;
}

export function TitleSettingsScreen() {
  const settings = useSettings(titleSettings);
  const models = useModels(settings.status === "ready" ? settings.values.provider : "claude");
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="제목 자동화">
        <SettingsCard>
          <SettingsRow label="설정" hint={settings.status === "loading" ? "불러오는 중…" : settings.error} />
        </SettingsCard>
      </SettingsSection>
    );
  }
  const { values, revision } = settings;
  const save = (next: Partial<typeof values>) => void settings.save({ ...values, ...next }, revision);
  const modelOptions = [{ label: DEFAULT_LABEL[values.provider], value: "" }, ...models];
  // A saved model the daemon no longer lists (or an alias like "haiku") stays selectable.
  if (values.model && !models.some((model) => model.value === values.model)) modelOptions.push({ label: values.model, value: values.model });
  return (
    <SettingsSection title="제목 자동화">
      <SettingsCard>
        <SettingsSelect
          label="제목 생성 도구"
          hint="이 호스트에 설치·로그인된 CLI로 제목을 짓습니다."
          error={settings.saveError ?? undefined}
          value={values.provider}
          options={PROVIDERS.map((provider) => ({ label: provider === "claude" ? "Claude Code" : "Codex", value: provider }))}
          onValueChange={(provider) => save({ provider, model: "" })}
        />
        <SettingsSelect
          label="제목 생성 모델"
          hint="가벼운 모델로 충분합니다. 상위 모델일수록 느리고 사용량을 더 씁니다."
          value={values.model}
          options={modelOptions}
          onValueChange={(model) => save({ model })}
        />
        <SettingsSelect
          label="제목 지을 때 참고할 대화 분량"
          hint="세션의 사용자 메시지를 처음부터 끝까지 고르게 골라 이 글자 수까지 넣습니다. 클수록 전체 흐름을 더 보지만 토큰을 더 씁니다."
          value={String(values.contextChars)}
          options={CONTEXT_CHOICES.map((chars) => ({ label: `${chars.toLocaleString()}자`, value: String(chars) }))}
          onValueChange={(value) => save({ contextChars: Number(value) })}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
