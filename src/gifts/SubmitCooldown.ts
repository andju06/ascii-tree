/** Client-side throttle between gift submissions; the server enforces its own limit too. */
export class SubmitCooldown {
  constructor(
    private readonly seconds = 30,
    private readonly storageKey = "ascii-tree:last-gift",
  ) {}

  remainingSeconds(now = Date.now()): number {
    const last = Number(localStorage.getItem(this.storageKey) ?? 0);
    const remaining = this.seconds - (now - last) / 1000;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  }

  mark(now = Date.now()): void {
    localStorage.setItem(this.storageKey, String(now));
  }
}
