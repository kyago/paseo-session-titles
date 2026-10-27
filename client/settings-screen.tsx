import { useSettings } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsRow, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import { CONTEXT_CHOICES, MODEL_CHOICES, titleSettings } from "../shared/settings";

export function TitleSettingsScreen() {
  const settings = useSettings(titleSettings);
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="제목 자동화">
        <SettingsCard>
          <SettingsRow label="설정" hint={settings.status === "loading" ? "불러오는 중…" : settings.error} />
        </SettingsCard>
      </SettingsSection>
    );
  }
  return (
    <SettingsSection title="제목 자동화">
      <SettingsCard>
        <SettingsSelect
          label="제목 생성 모델"
          hint="Claude CLI로 제목을 짓는 모델입니다. 기본 haiku는 빠르고 저렴하며, 상위 모델일수록 느리고 사용량을 더 씁니다."
          error={settings.saveError ?? undefined}
          value={settings.values.model}
          options={MODEL_CHOICES.map((model) => ({ label: model, value: model }))}
          onValueChange={(value) => void settings.save({ ...settings.values, model: value as (typeof MODEL_CHOICES)[number] }, settings.revision)}
        />
        <SettingsSelect
          label="제목 지을 때 참고할 대화 분량"
          hint="세션의 사용자 메시지를 처음부터 끝까지 고르게 골라 이 글자 수까지 넣습니다. 클수록 전체 흐름을 더 보지만 토큰을 더 씁니다."
          error={settings.saveError ?? undefined}
          value={String(settings.values.contextChars)}
          options={CONTEXT_CHOICES.map((chars) => ({ label: `${chars.toLocaleString()}자`, value: String(chars) }))}
          onValueChange={(value) => void settings.save({ ...settings.values, contextChars: Number(value) }, settings.revision)}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
