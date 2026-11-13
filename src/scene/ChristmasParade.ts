import { TAU } from "../core/math";
import type { Resettable, Updatable } from "../core/types";
import type { CameraView } from "../render/Camera";
import type { SpriteSink } from "../render/SpriteLayer";

const SLEIGH = ["    _^_ ", "___ (o*)", "\\___/   ", " o   o  "];
const SLEIGH_COLORS = ["#f4f4f4", "#c0392b", "#8a5a2b", "#f2f2f2"];

const SLEIGH_LAP = 14;
const SLEIGH_Y = 3.55;
const SLEIGH_ID = "parade:sleigh";

/** A reindeer sleigh looping above the tree. */
export class ChristmasParade implements Updatable, Resettable {
  private running = false;

  constructor(
    private readonly sprites: SpriteSink,
    private readonly camera: CameraView,
  ) {}

  start(): void {
    this.running = true;
  }

  update(_dt: number, time: number): void {
    if (!this.running) return;
    const flight = (TAU * time) / SLEIGH_LAP + 1.2;
    const angle = flight;
    const y = SLEIGH_Y + Math.sin(flight * 2) * 0.4;
    const x = Math.cos(angle) * 5.2;
    const z = Math.sin(angle) * 5.2 * 0.72;
    const right = Math.sin(angle + this.camera.yaw) < 0;
    this.sprites.set(SLEIGH_ID, {
      lines: right ? SLEIGH : SLEIGH.map((line) => [...line].reverse().join("")),
      colors: SLEIGH_COLORS,
      x,
      y,
      z,
      scale: 2.15,
      alpha: 1,
    });
  }

  reset(): void {
    this.running = false;
    this.sprites.remove(SLEIGH_ID);
  }
}
