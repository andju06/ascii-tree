/** Shared open/close behavior: backdrop click, `[data-close]` buttons and Escape. */
export class Modal {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.close();
  };

  /** `signal` detaches the DOM listeners when the owning app is disposed. */
  constructor(
    private readonly root: HTMLElement,
    signal: AbortSignal,
    private readonly onClose: () => void = () => {},
  ) {
    // Backdrop closes on pointerdown so the click that opened the modal cannot immediately close it.
    root.addEventListener(
      "pointerdown",
      (event) => {
        if (event.target === root) this.close();
      },
      { signal },
    );
    root.addEventListener(
      "click",
      (event) => {
        if ((event.target as HTMLElement).closest("[data-close]")) this.close();
      },
      { signal },
    );
    signal.addEventListener("abort", () => this.close(), { once: true });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    if (this.isOpen) return;
    this.root.hidden = false;
    window.addEventListener("keydown", this.onKeyDown);
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    window.removeEventListener("keydown", this.onKeyDown);
    this.onClose();
  }
}
