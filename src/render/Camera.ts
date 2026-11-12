import { clamp } from "../core/math";
import type { Updatable } from "../core/types";

export interface CameraView {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  /** World height the camera aims at. */
  readonly target: number;
  /** Focal length as a fraction of the viewport height. */
  readonly zoom: number;
  /** Vertical screen anchor of the target, 0 = top, 1 = bottom. */
  readonly screenCenterY: number;
}

export class Camera implements CameraView, Updatable {
  static readonly minZoom = 0.7;
  static readonly maxZoom = 2.2;

  yaw = 0;
  pitch: number;
  readonly distance = 10;
  readonly target = 1.6;
  zoom = 1.1;
  readonly screenCenterY = 0.5;

  constructor(
    private readonly autoSpeed = 0.35,
    initialPitch = 0.22,
  ) {
    this.pitch = initialPitch;
  }

  get rotationDegrees(): number {
    const degrees = (this.yaw * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
  }

  update(dt: number): void {
    this.yaw += this.autoSpeed * dt;
  }

  drag(dx: number, dy: number): void {
    this.yaw += dx * 0.008;
    this.pitch = clamp(this.pitch + dy * 0.003, 0.02, 0.6);
  }

  /** Changes how large the tree is drawn inside the fixed viewport. */
  nudgeZoom(delta: number): void {
    this.zoom = clamp(this.zoom + delta, Camera.minZoom, Camera.maxZoom);
  }
}
