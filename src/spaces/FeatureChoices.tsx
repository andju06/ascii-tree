import type { TreeFeatures } from "@/spaces/features";

const CHOICES = [
  { key: "rudolph", label: "루돌프", hint: "트리 위를 빙글빙글. 썰매를 눌러 보면 인사를 건넵니다." },
  { key: "santa", label: "산타", hint: "빨간 상자를 열면 누군가 달아납니다. 잡을 수 있을까요." },
  { key: "snowman", label: "눈사람", hint: "녹아 없어지기 전에 잡아 보세요. 뭔가 내어줄지도 모릅니다." },
] as const;

export function FeatureChoices({
  features,
  onChange,
}: {
  readonly features: TreeFeatures;
  readonly onChange: (features: TreeFeatures) => void;
}) {
  return CHOICES.map((choice) => (
    <label className="setup-choice" key={choice.key}>
      <input
        type="checkbox"
        checked={features[choice.key]}
        onChange={(event) => onChange({ ...features, [choice.key]: event.target.checked })}
      />
      <span>
        <span className="setup-name">{choice.label}</span>
        <span className="setup-hint">{choice.hint}</span>
      </span>
    </label>
  ));
}
