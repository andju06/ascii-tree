export const TREE_NAME_LIMIT = { min: 1, max: 24 } as const;

/** Default label for a tree that has not been named yet. */
export function defaultTreeName(loginId: string): string {
  return `${loginId}의 트리`;
}

export function displayTreeName(name: string, loginId: string): string {
  if (name) return name;
  if (loginId) return defaultTreeName(loginId);
  return "이름 없는 트리";
}

type NameResult = { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string };

/** Missing names stay unlabeled. Invalid stored values are ignored. */
export function readTreeName(value: unknown): string | null {
  const parsed = parseTreeName(value);
  return parsed.ok ? parsed.value : null;
}

export function parseTreeName(value: unknown): NameResult {
  if (typeof value !== "string") return { ok: false, error: "트리 이름을 입력해 주세요." };
  const name = value.trim();
  const length = [...name].length;
  if (length < TREE_NAME_LIMIT.min || length > TREE_NAME_LIMIT.max) {
    return { ok: false, error: `트리 이름은 ${TREE_NAME_LIMIT.min}~${TREE_NAME_LIMIT.max}자입니다.` };
  }
  return { ok: true, value: name };
}
