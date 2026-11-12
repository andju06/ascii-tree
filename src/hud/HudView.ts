export type RunStatus = "running" | "paused" | "complete";

export interface HudState {
  readonly time: number;
  readonly fps: number;
  readonly rotationDegrees: number;
  readonly lightsLit: number;
  readonly lightsTotal: number;
  readonly letters: number;
  readonly gifts: number;
  readonly unopened: number;
  readonly status: RunStatus;
}

export interface HudElements {
  readonly time: HTMLElement;
  readonly rotation: HTMLElement;
  readonly lights: HTMLElement;
  readonly letters: HTMLElement;
  readonly status: HTMLElement;
  readonly gifts?: HTMLElement;
}

const numberFormat = new Intl.NumberFormat("en-US");

export class HudView {
  private lastRender = -Infinity;

  constructor(
    private readonly elements: HudElements,
    private readonly intervalMs = 100,
  ) {}

  render(state: HudState, nowMs: number): void {
    if (nowMs - this.lastRender < this.intervalMs) return;
    this.lastRender = nowMs;
    const { elements } = this;
    elements.time.textContent = `t ${state.time.toFixed(2)}s`;
    elements.rotation.textContent = `${state.rotationDegrees.toFixed(2)}°`;
    elements.lights.textContent = `${state.lightsLit}/${state.lightsTotal}`;
    elements.letters.textContent = numberFormat.format(state.letters);
    if (elements.gifts) {
      elements.gifts.textContent = `${numberFormat.format(state.gifts)} · unopened ${numberFormat.format(state.unopened)}`;
    }
    elements.status.textContent = `${state.status} · ${Math.round(state.fps)} fps`;
    elements.status.dataset.status = state.status;
  }
}
