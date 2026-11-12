export class Clock {
  private last: number | null = null;
  private elapsed = 0;
  private delta = 0;
  private smoothedFps = 0;
  private isPaused = false;

  constructor(private readonly maxDelta = 0.1) {}

  get time(): number {
    return this.elapsed;
  }

  get dt(): number {
    return this.delta;
  }

  get fps(): number {
    return this.smoothedFps;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  tick(nowMs: number): void {
    const raw = this.last === null ? 0 : (nowMs - this.last) / 1000;
    this.last = nowMs;
    if (raw > 0) {
      const instant = 1 / raw;
      this.smoothedFps = this.smoothedFps === 0 ? instant : this.smoothedFps * 0.92 + instant * 0.08;
    }
    this.delta = this.isPaused ? 0 : Math.min(raw, this.maxDelta);
    this.elapsed += this.delta;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  reset(): void {
    this.elapsed = 0;
    this.delta = 0;
  }
}
