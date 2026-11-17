/** True when the login id is one of the comma-separated `ADMIN_EMAIL` values. */
export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return admins.includes(email.trim().toLowerCase());
}
