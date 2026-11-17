/** Same-site path only. Anything else returns the public tree. */
export function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("?")) return "/";
  if (value.length > 200) return "/";
  return value;
}
