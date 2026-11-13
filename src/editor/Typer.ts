import type { EventBus } from "../core/EventBus";
import type { Random } from "../core/Random";
import type { AppEvents, Resettable, Updatable } from "../core/types";
import type { CodeScript } from "./CodeScript";

export interface TypingSource {
  readonly text: string;
  readonly cursor: number;
}

export interface TyperOptions {
  readonly charsPerSecond: number;
  readonly linePause: number;
  readonly startDelay: number;
}

/** Advances a cursor through the script and emits stage events as markers are passed. */
export class Typer implements TypingSource, Updatable, Resettable {
  private position = 0;
  private markerIndex = 0;
  private completed = false;
  private wait: number;

  constructor(
    private readonly script: CodeScript,
    private readonly bus: EventBus<AppEvents>,
    private readonly rng: Random,
    private readonly options: TyperOptions,
  ) {
    this.wait = options.startDelay;
  }

  get text(): string {
    return this.script.text;
  }

  get cursor(): number {
    return this.position;
  }

  get done(): boolean {
    return this.position >= this.script.text.length;
  }

  update(dt: number): void {
    if (this.done) return;
    this.wait -= dt;
    while (this.wait <= 0 && !this.done) this.wait += this.typeNext();
  }

  skipToNextStage(): void {
    if (this.done) return;
    const marker = this.script.markers[this.markerIndex];
    this.position = marker ? marker.offset : this.script.text.length;
    this.wait = this.options.linePause;
    this.flushMarkers();
  }

  /** Finishes the remaining script so every stage and the closing credit appear at once. */
  finish(): void {
    if (this.done) return;
    this.position = this.script.text.length;
    this.wait = 0;
    this.flushMarkers();
  }

  reset(): void {
    this.position = 0;
    this.markerIndex = 0;
    this.completed = false;
    this.wait = this.options.startDelay;
  }

  /** Types one character and returns the delay before the next one. */
  private typeNext(): number {
    const text = this.script.text;
    const char = text[this.position++];
    let delay: number;
    if (char === "\n") {
      while (text[this.position] === " ") this.position++;
      delay = this.options.linePause * this.rng.uniform(0.6, 1.6);
    } else {
      delay = this.rng.uniform(0.35, 1.65) / this.options.charsPerSecond;
    }
    this.flushMarkers();
    return delay;
  }

  private flushMarkers(): void {
    const { markers } = this.script;
    while (this.markerIndex < markers.length && markers[this.markerIndex].offset <= this.position) {
      this.bus.emit("stage", markers[this.markerIndex].stage);
      this.markerIndex++;
    }
    if (this.done && !this.completed) {
      this.completed = true;
      this.bus.emit("complete", undefined);
    }
  }
}
