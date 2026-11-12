import type { ParticleSource } from "../scene/ParticleSource";
import { KIND_STYLES, Kind } from "../scene/kinds";
import type { CameraView } from "./Camera";
import { FrameBuffer } from "./FrameBuffer";
import { quantizeColor } from "./palette";
import type { Viewport } from "./Viewport";

const NEAR_PLANE = 0.1;
const NORMAL_Y = 0.3;
const LIGHT = normalize(-0.45, 0.55, -0.7);
const FLASH_LEVEL = 0.95;

function normalize(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
}

function fadeOf(age: number, duration: number): number {
  return age >= duration ? 1 : age / duration;
}

function flickerOf(speed: number, time: number, phase: number): number {
  return 0.5 + 0.5 * Math.sin(time * speed * (0.7 + 0.1 * phase) + phase);
}

/** Projects particles from several sources onto a character grid using a nearest-wins depth buffer. */
export class AsciiRasterizer {
  private frame: FrameBuffer | null = null;

  rasterize(
    sources: readonly ParticleSource[],
    camera: CameraView,
    viewport: Viewport,
    time: number,
  ): FrameBuffer {
    const fb = this.frameFor(viewport);
    fb.begin();
    sources.forEach((source, index) => this.project(fb, source, index, camera, viewport, time));
    this.shade(fb, sources, camera, time);
    return fb;
  }

  private frameFor({ cols, rows }: Viewport): FrameBuffer {
    if (!this.frame || this.frame.cols !== cols || this.frame.rows !== rows) {
      this.frame = new FrameBuffer(cols, rows);
    }
    return this.frame;
  }

  private project(
    fb: FrameBuffer,
    source: ParticleSource,
    sourceIndex: number,
    camera: CameraView,
    viewport: Viewport,
    time: number,
  ): void {
    const cosY = Math.cos(camera.yaw);
    const sinY = Math.sin(camera.yaw);
    const cosP = Math.cos(camera.pitch);
    const sinP = Math.sin(camera.pitch);
    const focal = viewport.height * camera.zoom;
    const centerX = viewport.width / 2;
    const centerY = viewport.height * camera.screenCenterY;
    const invCellW = 1 / viewport.cellW;
    const invCellH = 1 / viewport.cellH;
    const { cols, rows, depth, owner, ownerSource } = fb;
    const { x, y, z, kind, appear, phase, drop } = source;

    for (let i = 0, n = source.count; i < n; i++) {
      const age = time - appear[i];
      if (age < 0) continue;
      const style = KIND_STYLES[kind[i]];

      if (kind[i] === Kind.Light) {
        fb.lightsTotal++;
        if (flickerOf(style.flicker, time, phase[i]) > 0.5) fb.lightsLit++;
      }

      const settle = 1 - fadeOf(age, style.fadeIn);
      const wx = x[i];
      const wz = z[i];
      const xr = style.billboard ? wx : wx * cosY - wz * sinY;
      const zr = style.billboard ? wz : wx * sinY + wz * cosY;
      const yc = y[i] + settle * settle * drop[i] - camera.target;
      const yr = yc * cosP + zr * sinP;
      const d = camera.distance - yc * sinP + zr * cosP;
      if (d < NEAR_PLANE) continue;

      const scale = focal / d;
      const col = Math.floor((centerX + xr * scale) * invCellW);
      if (col < 0 || col >= cols) continue;
      const row = Math.floor((centerY - yr * scale) * invCellH);
      if (row < 0 || row >= rows) continue;

      const cell = row * cols + col;
      if (d < depth[cell]) {
        depth[cell] = d;
        owner[cell] = i;
        ownerSource[cell] = sourceIndex;
      }
    }
  }

  private shade(fb: FrameBuffer, sources: readonly ParticleSource[], camera: CameraView, time: number): void {
    const cosY = Math.cos(camera.yaw);
    const sinY = Math.sin(camera.yaw);
    const { owner, ownerSource, depth } = fb;

    for (let cell = 0, total = fb.cols * fb.rows; cell < total; cell++) {
      const i = owner[cell];
      if (i < 0) continue;
      const source = sources[ownerSource[cell]];
      const style = KIND_STYLES[source.kind[i]];
      const age = time - source.appear[i];
      let level = source.bright[i] * fadeOf(age, style.fadeIn);
      const flash = style.flash > 0 ? 1 - fadeOf(age, style.flash) : 0;

      if (style.shaded) {
        const px = source.x[i];
        const pz = source.z[i];
        const len = Math.hypot(px, pz) || 1;
        const nx = (px / len) * 0.95;
        const nz = (pz / len) * 0.95;
        const rx = nx * cosY - nz * sinY;
        const rz = nx * sinY + nz * cosY;
        const diffuse = Math.max(0, rx * LIGHT.x + NORMAL_Y * LIGHT.y + rz * LIGHT.z);
        const depthFalloff = Math.min(1.15, Math.max(0.55, 1 - (depth[cell] - camera.distance) * 0.15));
        level *= (0.22 + 0.78 * diffuse) * depthFalloff;
      }
      if (style.flicker > 0) level *= 0.2 + 0.95 * flickerOf(style.flicker, time, source.phase[i]);
      if (flash > 0) level = Math.max(level, flash);
      if (level <= 0) continue;

      const ramp = style.ramp;
      const glyphIndex = Math.min(ramp.length - 1, Math.floor(level * ramp.length));
      if (glyphIndex === 0) continue;

      const intensity = (0.35 + 0.8 * Math.min(1, level)) * (1 - flash);
      const white = flash * FLASH_LEVEL;
      fb.write(
        cell,
        ramp.charCodeAt(glyphIndex),
        quantizeColor(source.r[i] * intensity + white, source.g[i] * intensity + white, source.b[i] * intensity + white),
        style.glow,
      );
    }
  }
}
